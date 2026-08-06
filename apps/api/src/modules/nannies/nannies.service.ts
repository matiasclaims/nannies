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
import { CLAVES_DOCUMENTOS, CLAVES_CURSOS, soloClavesValidas } from './catalogos';

const todas = (tiene: string[], catalogo: string[]) => catalogo.every((c) => tiene.includes(c));

const APP_URL = process.env.APP_URL ?? 'https://nannies-api.vercel.app';

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
    const nannies = await this.prisma.nannie.findMany({
      orderBy: [{ nombre: 'asc' }],
      include: { usuario: { select: { email: true, activo: true } } },
    });
    return nannies.map((n) => ({
      id: n.id,
      nombre: n.nombre,
      foto: n.foto,
      correo: n.usuario?.email ?? null,
      telefono: n.telefono,
      plaza: n.plaza,
      zonas: n.zonas,
      color: n.color,
      rango: n.rangoPermanente,
      estado: n.estado,
      documentacionCompleta: todas(n.documentosEntregados, CLAVES_DOCUMENTOS),
      capacitacionCompleta: todas(n.cursosCompletados, CLAVES_CURSOS),
      documentosEntregados: n.documentosEntregados,
      cursosCompletados: n.cursosCompletados,
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
    return {
      id: n.id,
      nombre: n.nombre,
      foto: n.foto,
      correo: n.usuario?.email ?? null,
      telefono: n.telefono,
      plaza: n.plaza,
      zonas: n.zonas,
      color: n.color,
      rango: n.rangoPermanente,
      nivelActual: n.nivelTarifaMesActual,
      estado: n.estado,
      documentacionCompleta: todas(n.documentosEntregados, CLAVES_DOCUMENTOS),
      capacitacionCompleta: todas(n.cursosCompletados, CLAVES_CURSOS),
      documentosEntregados: n.documentosEntregados,
      cursosCompletados: n.cursosCompletados,
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
    const correo = dto.correo.trim().toLowerCase();
    const existe = await this.prisma.usuario.findUnique({ where: { email: correo } });
    if (existe) throw new BadRequestException('Ya existe una cuenta con ese correo.');

    const temp = passwordTemporal();
    const passwordHash = await argon2.hash(temp, { type: argon2.argon2id });

    const nannie = await this.prisma.$transaction(async (tx) => {
      const n = await tx.nannie.create({
        data: {
          nombre: dto.nombre.trim(),
          telefono: dto.telefono?.trim() || null,
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
        ...(dto.telefono !== undefined ? { telefono: dto.telefono.trim() || null } : {}),
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
