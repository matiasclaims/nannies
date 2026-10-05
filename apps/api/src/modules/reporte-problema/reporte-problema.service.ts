import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../core/mail/mail.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearReporteProblemaDto } from './dto/crear-reporte-problema.dto';

const TIPO_LABEL: Record<string, string> = {
  ERROR: 'Error',
  SUGERENCIA: 'Sugerencia',
  DUDA: 'Duda',
};

/** Correo "real" de contacto: tiene @ y no es el placeholder de login @nannies.mx.
 *  El login de las nannies es usuario@nannies.mx; su correo PERSONAL (donde reciben
 *  asignaciones y recordatorios) vive en Nannie.email. */
const esCorreoReal = (e?: string | null): boolean =>
  !!e && e.includes('@') && !e.toLowerCase().endsWith('@nannies.mx');

/** Reporte de problemas del sistema: lo guarda y avisa por correo. */
@Injectable()
export class ReporteProblemaService {
  private readonly logger = new Logger(ReporteProblemaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async crear(user: UsuarioAutenticado, dto: CrearReporteProblemaDto) {
    const tipo = dto.tipo ?? 'ERROR';
    const reporte = await this.prisma.reporteProblema.create({
      data: {
        usuarioId: user.sub,
        autorNombre: user.nombre,
        rol: user.rol,
        tipo,
        descripcion: dto.descripcion.trim().slice(0, 2000),
        url: dto.url?.slice(0, 500) || null,
        userAgent: dto.userAgent?.slice(0, 500) || null,
      },
      select: { id: true, creadoEn: true },
    });

    // Aviso por correo (no bloquea si falla / no está configurado).
    const to = process.env.REPORTE_EMAIL ?? 'ima.mario.matias@gmail.com';
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#0F172A;max-width:560px;margin:auto">
        <h2 style="color:#0CC0DF;margin-bottom:4px">Reporte del sistema · ${esc(TIPO_LABEL[tipo] ?? tipo)}</h2>
        <p style="color:#64748B;font-size:13px;margin-top:0">
          ${esc(user.nombre)} (${esc(user.rol)}) · ${reporte.creadoEn.toLocaleString('es-MX')}
        </p>
        <p style="background:#F4F7FB;border-radius:8px;padding:12px 16px;white-space:pre-wrap">${esc(dto.descripcion.trim())}</p>
        ${dto.url ? `<p style="font-size:12px;color:#64748B"><strong>Pantalla:</strong> ${esc(dto.url)}</p>` : ''}
        ${dto.userAgent ? `<p style="font-size:12px;color:#64748B"><strong>Dispositivo:</strong> ${esc(dto.userAgent)}</p>` : ''}
      </div>`;
    void this.mail
      .enviar(to, `[Nannies] ${TIPO_LABEL[tipo] ?? tipo} reportado por ${user.nombre}`, html)
      .catch((e) => this.logger.error(`No se pudo enviar el correo del reporte: ${String(e)}`));

    return { ok: true as const, id: reporte.id };
  }

  /** Lista los reportes (perfil PROGRAMADOR) con el correo de quien reportó,
   *  opcionalmente filtrados por estado. */
  async listar(estado?: string) {
    const where = estado && estado !== 'TODOS' ? { estado } : {};
    const reportes = await this.prisma.reporteProblema.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      take: 300,
    });
    // El correo del que reportó (usuarioId es string suelto, sin relación).
    const ids = [...new Set(reportes.map((r) => r.usuarioId).filter((x): x is string => !!x))];
    const usuarios = ids.length
      ? await this.prisma.usuario.findMany({
          where: { id: { in: ids } },
          select: { id: true, email: true, nannie: { select: { email: true } } },
        })
      : [];
    // Muestra el correo al que REALMENTE llegaría el aviso: el personal de la
    // nannie (Nannie.email) si es real; si no, el de la cuenta.
    const correoDe = new Map(
      usuarios.map((u) => [u.id, esCorreoReal(u.nannie?.email) ? u.nannie!.email! : u.email]),
    );
    return reportes.map((r) => ({
      id: r.id,
      autorNombre: r.autorNombre,
      rol: r.rol,
      correo: r.usuarioId ? (correoDe.get(r.usuarioId) ?? null) : null,
      tipo: r.tipo,
      descripcion: r.descripcion,
      url: r.url,
      userAgent: r.userAgent,
      estado: r.estado,
      notaResolucion: r.notaResolucion,
      resueltoEn: r.resueltoEn?.toISOString() ?? null,
      creadoEn: r.creadoEn.toISOString(),
    }));
  }

  /** Marca un reporte EN_REVISION (sin avisar a quien reportó). */
  async marcarEnRevision(id: string) {
    const r = await this.prisma.reporteProblema.findUnique({ where: { id }, select: { id: true } });
    if (!r) throw new NotFoundException('Reporte no encontrado');
    await this.prisma.reporteProblema.update({ where: { id }, data: { estado: 'EN_REVISION' } });
    return { ok: true as const };
  }

  /** Marca un reporte RESUELTO y avisa por correo a quien lo reportó. */
  async resolver(id: string, nota?: string) {
    const r = await this.prisma.reporteProblema.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reporte no encontrado');
    const notaLimpia = nota?.trim().slice(0, 1000) || null;
    await this.prisma.reporteProblema.update({
      where: { id },
      data: { estado: 'RESUELTO', notaResolucion: notaLimpia, resueltoEn: new Date() },
    });

    // Aviso por correo a quien reportó (no bloquea si falla / no hay correo).
    // Prefiere el correo PERSONAL de la nannie (Nannie.email), el mismo al que le
    // llegan asignaciones y recordatorios; si no hay uno real, usa el de la cuenta.
    let correo: string | null = null;
    if (r.usuarioId) {
      const u = await this.prisma.usuario.findUnique({
        where: { id: r.usuarioId },
        select: { email: true, nannie: { select: { email: true } } },
      });
      correo = esCorreoReal(u?.nannie?.email) ? u!.nannie!.email! : (u?.email ?? null);
    }
    if (correo) {
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = `
        <div style="font-family:Segoe UI,Arial,sans-serif;color:#0F172A;max-width:560px;margin:auto">
          <h2 style="color:#0CC0DF;margin-bottom:4px">Tu reporte fue atendido</h2>
          <p style="color:#64748B;font-size:13px;margin-top:0">Hola ${esc(r.autorNombre)}, ya revisamos lo que reportaste.</p>
          ${notaLimpia ? `<p style="background:#EAF9EE;border-left:3px solid #43A047;border-radius:6px;padding:12px 16px;white-space:pre-wrap">${esc(notaLimpia)}</p>` : '<p>Ya quedó resuelto.</p>'}
          <p style="font-size:12px;color:#64748B;margin-top:16px"><strong>Tu reporte:</strong></p>
          <p style="background:#F4F7FB;border-radius:8px;padding:12px 16px;white-space:pre-wrap;font-size:13px">${esc(r.descripcion)}</p>
          <p style="font-size:12px;color:#94A3B8">Si el problema sigue, repórtalo de nuevo desde la app.</p>
        </div>`;
      void this.mail
        .enviar(correo, '[Nannies] Tu reporte fue atendido', html)
        .catch((e) => this.logger.error(`No se pudo enviar el aviso de reporte resuelto: ${String(e)}`));
    } else {
      this.logger.warn(`Reporte ${id} resuelto sin correo de destino (usuarioId=${r.usuarioId ?? 'null'}).`);
    }
    return { ok: true as const, avisado: !!correo };
  }
}
