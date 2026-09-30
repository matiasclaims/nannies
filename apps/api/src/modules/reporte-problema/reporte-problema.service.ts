import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../core/mail/mail.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearReporteProblemaDto } from './dto/crear-reporte-problema.dto';

const TIPO_LABEL: Record<string, string> = {
  ERROR: 'Error',
  SUGERENCIA: 'Sugerencia',
  DUDA: 'Duda',
};

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
}
