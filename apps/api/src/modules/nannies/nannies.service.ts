import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../core/mail/mail.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearNannieDto } from './dto/crear-nannie.dto';
import { EditarNannieDto } from './dto/editar-nannie.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { RegenerarAccesoDto } from './dto/regenerar-acceso.dto';
import { CLAVES_DOCUMENTOS, CLAVES_CURSOS, soloClavesValidas } from './catalogos';

const todas = (tiene: string[], catalogo: string[]) => catalogo.every((c) => tiene.includes(c));

const APP_URL = process.env.APP_URL ?? 'https://nannies-api.vercel.app';
/** Dominio del LOGIN de las nannies: el usuario queda como usuario@nannies.mx. */
const DOMINIO_CORREO = 'nannies.mx';

/** Contraseña temporal legible (~12 chars). */
function passwordTemporal(): string {
  return randomBytes(9).toString('base64url');
}

/** M4 · Expediente y alta de nannies (Directora + Subdirectora). */
@Injectable()
export class NanniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Lista de expedientes (con su correo y estado). */
  async listar() {
    const [nannies, subidos] = await Promise.all([
      this.prisma.nannie.findMany({
        orderBy: [{ nombre: 'asc' }],
        include: { usuario: { select: { email: true, activo: true } } },
      }),
      this.prisma.documentoNannie.findMany({ select: { nannieId: true, clave: true } }),
    ]);
    // Documentación/capacitación = lo que la nannie SUBIÓ (fuente de verdad),
    // ya no un marcado manual (Mario 2026-09-25).
    const infoPorNannie = new Map<string, { docs: string[]; cursos: string[] }>();
    for (const d of subidos) {
      const it = infoPorNannie.get(d.nannieId) ?? { docs: [], cursos: [] };
      if (CLAVES_DOCUMENTOS.includes(d.clave)) it.docs.push(d.clave);
      else if (CLAVES_CURSOS.includes(d.clave)) it.cursos.push(d.clave);
      infoPorNannie.set(d.nannieId, it);
    }
    const info = (id: string) => infoPorNannie.get(id) ?? { docs: [], cursos: [] };
    return nannies.map((n) => ({
      id: n.id,
      nombre: n.nombre,
      foto: n.foto,
      correo: n.usuario?.email ?? null, // login (usuario@nannies.mx)
      emailPersonal: n.email ?? null, // correo de contacto (ficha)
      telefono: n.telefono,
      plaza: n.plaza,
      zonas: n.zonas,
      color: n.color,
      rango: n.rangoPermanente,
      estado: n.estado,
      documentacionCompleta: todas(info(n.id).docs, CLAVES_DOCUMENTOS),
      capacitacionCompleta: todas(info(n.id).cursos, CLAVES_CURSOS),
      documentosEntregados: info(n.id).docs,
      cursosCompletados: info(n.id).cursos,
      serviciosAcumulados: n.serviciosAcumulados,
      tieneCuenta: !!n.usuario,
    }));
  }

  /** Expediente detallado de una nannie. */
  async perfil(id: string) {
    const n = await this.prisma.nannie.findUnique({
      where: { id },
      include: { usuario: { select: { email: true, activo: true } } },
    });
    if (!n) throw new NotFoundException('Nannie no encontrada');
    // Documentación/capacitación = lo que la nannie subió (fuente de verdad).
    const claves = (
      await this.prisma.documentoNannie.findMany({ where: { nannieId: id }, select: { clave: true } })
    ).map((d) => d.clave);
    const docs = claves.filter((c) => CLAVES_DOCUMENTOS.includes(c));
    const cursos = claves.filter((c) => CLAVES_CURSOS.includes(c));
    return {
      id: n.id,
      nombre: n.nombre,
      foto: n.foto,
      especialidad: n.especialidad,
      correo: n.usuario?.email ?? null, // login (usuario@nannies.mx)
      emailPersonal: n.email ?? null, // correo de contacto (ficha)
      telefono: n.telefono,
      plaza: n.plaza,
      zonas: n.zonas,
      color: n.color,
      rango: n.rangoPermanente,
      nivelActual: n.nivelTarifaMesActual,
      estado: n.estado,
      documentacionCompleta: todas(docs, CLAVES_DOCUMENTOS),
      capacitacionCompleta: todas(cursos, CLAVES_CURSOS),
      documentosEntregados: docs,
      cursosCompletados: cursos,
      serviciosAcumulados: n.serviciosAcumulados,
      tieneCuenta: !!n.usuario,
    };
  }

  /**
   * Alta: crea el expediente + la cuenta (rol NANNIE, estado Prueba) con una
   * contraseña temporal y manda el correo de bienvenida. Si el correo no se
   * pudo enviar (Resend no configurado), devuelve la contraseña como respaldo.
   */
  async crear(dto: CrearNannieDto) {
    // El LOGIN es usuario@nannies.mx (más formal). El correo personal va en la ficha.
    const correo = `${dto.usuario.trim().toLowerCase()}@${DOMINIO_CORREO}`;
    const emailPersonal = dto.emailPersonal?.trim().toLowerCase() || null;
    const existe = await this.prisma.usuario.findUnique({ where: { email: correo } });
    if (existe) throw new BadRequestException(`Ya existe una cuenta con el usuario "${dto.usuario}".`);

    const temp = passwordTemporal();
    const passwordHash = await argon2.hash(temp, { type: argon2.argon2id });

    const nannie = await this.prisma.$transaction(async (tx) => {
      const n = await tx.nannie.create({
        data: {
          nombre: dto.nombre.trim(),
          telefono: dto.telefono?.trim() || null,
          email: emailPersonal,
          plaza: dto.plaza,
          zonas: dto.zonas,
          color: dto.color || null,
          rangoPermanente: 'BASE', // arranca en Base; sube solo en el cierre de mes
          estado: 'PRUEBA',
        },
      });
      await tx.usuario.create({
        data: {
          nombre: dto.nombre.trim(),
          email: correo,
          passwordHash,
          rol: Rol.NANNIE,
          nannieId: n.id,
          debeCambiarPassword: true,
        },
      });
      return n;
    });

    const correoEnviado = await this.mail.bienvenidaNannie(
      correo,
      dto.nombre.trim(),
      temp,
      `${APP_URL}/login`,
    );
    return {
      id: nannie.id,
      correo,
      correoEnviado,
      // Respaldo cuando el correo no salió (Resend sin configurar): para relaearla a mano.
      passwordTemporal: correoEnviado ? undefined : temp,
    };
  }

  /**
   * Regenera (o crea) el acceso de una nannie que YA existe en el expediente:
   * fija su usuario de login (usuario@nannies.mx) y genera una contraseña
   * temporal que se devuelve para que coordinación se la pase. Marca que debe
   * cambiarla al entrar. Si la cuenta existía, la reestablece; si no, la crea.
   * A diferencia de `crear`, NO da de alta un expediente nuevo.
   */
  async regenerarAcceso(id: string, dto: RegenerarAccesoDto) {
    const nannie = await this.prisma.nannie.findUnique({
      where: { id },
      include: { usuario: true },
    });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');

    const correo = `${dto.usuario.trim().toLowerCase()}@${DOMINIO_CORREO}`;
    // El login no puede chocar con la cuenta de OTRA persona.
    const existe = await this.prisma.usuario.findUnique({ where: { email: correo } });
    if (existe && existe.nannieId !== id) {
      throw new BadRequestException(`Ya existe una cuenta con el usuario "${dto.usuario}".`);
    }

    const temp = passwordTemporal();
    const passwordHash = await argon2.hash(temp, { type: argon2.argon2id });

    if (nannie.usuario) {
      await this.prisma.usuario.update({
        where: { id: nannie.usuario.id },
        data: { email: correo, passwordHash, debeCambiarPassword: true, activo: true },
      });
    } else {
      await this.prisma.usuario.create({
        data: {
          nombre: nannie.nombre,
          email: correo,
          passwordHash,
          rol: Rol.NANNIE,
          nannieId: nannie.id,
          debeCambiarPassword: true,
        },
      });
    }

    return { correo, passwordTemporal: temp };
  }

  /** Edita el expediente (datos, zonas, color, estado, cumplimiento). */
  async editar(id: string, dto: EditarNannieDto) {
    const n = await this.prisma.nannie.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Nannie no encontrada');

    // Checklists: se guardan solo claves válidas del catálogo; los booleanos
    // "completa" se derivan de tener todas.
    const docs =
      dto.documentosEntregados !== undefined
        ? soloClavesValidas(dto.documentosEntregados, CLAVES_DOCUMENTOS)
        : undefined;
    const cursos =
      dto.cursosCompletados !== undefined
        ? soloClavesValidas(dto.cursosCompletados, CLAVES_CURSOS)
        : undefined;

    const actualizada = await this.prisma.nannie.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.plaza !== undefined ? { plaza: dto.plaza } : {}),
        ...(dto.telefono !== undefined ? { telefono: dto.telefono.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() || null } : {}),
        ...(dto.especialidad !== undefined ? { especialidad: dto.especialidad.trim() || null } : {}),
        ...(dto.zonas !== undefined ? { zonas: dto.zonas } : {}),
        ...(dto.color !== undefined ? { color: dto.color || null } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(docs !== undefined
          ? { documentosEntregados: docs, documentacionCompleta: todas(docs, CLAVES_DOCUMENTOS) }
          : {}),
        ...(cursos !== undefined
          ? { cursosCompletados: cursos, capacitacionCompleta: todas(cursos, CLAVES_CURSOS) }
          : {}),
      },
    });
    return { ok: true, estado: actualizada.estado };
  }

  /** Foto de perfil de la nannie (la sube ella o la directora/subdirectora). */
  async actualizarFoto(id: string, foto: string | null) {
    const n = await this.prisma.nannie.findUnique({ where: { id }, select: { id: true } });
    if (!n) throw new NotFoundException('Nannie no encontrada');
    await this.prisma.nannie.update({ where: { id }, data: { foto: foto ?? null } });
    return { ok: true, foto: foto ?? null };
  }

  /** Bitácora de coordinación (M4): notas libres que solo ven Paula y Jackie. */
  async listarNotas(nannieId: string) {
    const notas = await this.prisma.notaNannie.findMany({
      where: { nannieId },
      orderBy: { creadoEn: 'desc' },
    });
    return notas.map((n) => ({
      id: n.id,
      texto: n.texto,
      autor: n.autorNombre,
      fecha: n.creadoEn.toISOString(),
    }));
  }

  async agregarNota(nannieId: string, texto: string, autorNombre: string) {
    const limpio = texto.trim();
    if (!limpio) throw new BadRequestException('La nota no puede estar vacía.');
    const n = await this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { id: true } });
    if (!n) throw new NotFoundException('Nannie no encontrada');
    await this.prisma.notaNannie.create({ data: { nannieId, texto: limpio, autorNombre } });
    return { ok: true };
  }

  async borrarNota(notaId: string) {
    await this.prisma.notaNannie.delete({ where: { id: notaId } }).catch(() => undefined);
    return { ok: true };
  }

  /** Baja lógica: estado BAJA + desactiva su cuenta (conserva historial). */
  async darDeBaja(id: string) {
    const n = await this.prisma.nannie.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Nannie no encontrada');
    await this.prisma.$transaction(async (tx) => {
      await tx.nannie.update({ where: { id }, data: { estado: 'BAJA' } });
      await tx.usuario.updateMany({ where: { nannieId: id }, data: { activo: false } });
    });
    return { ok: true };
  }

  /** Cambio de contraseña propio (primer ingreso con la temporal). */
  async cambiarPassword(user: UsuarioAutenticado, dto: CambiarPasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: user.sub } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    const ok = await argon2.verify(usuario.passwordHash, dto.actual);
    if (!ok) throw new ForbiddenException('La contraseña actual no es correcta.');
    const passwordHash = await argon2.hash(dto.nueva, { type: argon2.argon2id });
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash, debeCambiarPassword: false },
    });
    return { ok: true };
  }
}
