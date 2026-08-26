import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { ResponderEncuestaDto } from './dto/responder-encuesta.dto';

/** Umbral del reglamento (#14): promedio de papás por debajo → sugiere prueba. */
export const UMBRAL_PRUEBA = 7.5;
/** Mínimo de respuestas para que el aviso de <7.5 tenga sentido (no por 1 sola). */
const MIN_RESPUESTAS_ALERTA = 3;

function nuevoToken(): string {
  return randomBytes(18).toString('base64url');
}

/** M6 · 6.2 — Evaluación de papás por servicio (link/QR sin login). */
@Injectable()
export class EvaluacionFamiliaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Asegura (crea si falta) la evaluación de un servicio y devuelve su token.
   *  La nannie solo su propio servicio; coordinación cualquiera. */
  async linkDeServicio(servicioId: string, user: UsuarioAutenticado) {
    const servicio = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      select: { id: true, nannieId: true, estado: true },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (user.rol === 'NANNIE') {
      if (servicio.nannieId !== (user.nannieId ?? '__none__')) {
        throw new ForbiddenException('Solo puedes compartir la encuesta de tus propios servicios.');
      }
    } else if (user.rol !== 'DIRECTORA' && user.rol !== 'SUBDIRECTORA') {
      throw new ForbiddenException('No autorizado.');
    }
    const existente = await this.prisma.evaluacionServicio.findUnique({
      where: { servicioId },
      select: { token: true },
    });
    if (existente) return { token: existente.token };
    const creada = await this.prisma.evaluacionServicio.create({
      data: { servicioId, token: nuevoToken() },
      select: { token: true },
    });
    return { token: creada.token };
  }

  /** Contexto PÚBLICO de la encuesta (para la página del papá, sin login). */
  async encuestaPublica(token: string) {
    const ev = await this.prisma.evaluacionServicio.findUnique({
      where: { token },
      include: {
        servicio: {
          select: { fecha: true, tipoServicio: true, nannie: { select: { nombre: true } } },
        },
      },
    });
    if (!ev) throw new NotFoundException('Encuesta no encontrada.');
    return {
      respondido: ev.respondidoEn != null,
      fecha: ev.servicio.fecha.toISOString().slice(0, 10),
      tipoServicio: ev.servicio.tipoServicio,
      nannie: ev.servicio.nannie?.nombre ?? null,
    };
  }

  /** El papá responde la encuesta (una sola vez por servicio). */
  async responder(token: string, dto: ResponderEncuestaDto) {
    const ev = await this.prisma.evaluacionServicio.findUnique({ where: { token }, select: { id: true, respondidoEn: true } });
    if (!ev) throw new NotFoundException('Encuesta no encontrada.');
    if (ev.respondidoEn) {
      throw new BadRequestException('Esta encuesta ya fue respondida. ¡Gracias!');
    }
    await this.prisma.evaluacionServicio.update({
      where: { id: ev.id },
      data: {
        calificacion: dto.calificacion,
        volveriaContratar: dto.volveriaContratar,
        comentario: dto.comentario?.trim() || null,
        respondidoEn: new Date(),
      },
    });
    return { ok: true };
  }

  /** Resumen para la NANNIE (solo su propio promedio; sin respuestas ni familias). */
  async miResumen(user: UsuarioAutenticado) {
    if (!user.nannieId) throw new ForbiddenException('Solo las nannies tienen calificación de papás.');
    const evals = await this.prisma.evaluacionServicio.findMany({
      where: { servicio: { nannieId: user.nannieId }, respondidoEn: { not: null } },
      select: { calificacion: true },
    });
    return this.agregado(evals.map((e) => e.calificacion ?? 0));
  }

  /** Resumen para COORDINACIÓN: promedio + aviso <7.5 + respuestas individuales
   *  (con familia y comentario). Solo Directora/Subdirectora. */
  async resumenNannie(nannieId: string, user: UsuarioAutenticado) {
    if (user.rol !== 'DIRECTORA' && user.rol !== 'SUBDIRECTORA') {
      throw new ForbiddenException('No autorizado.');
    }
    const evals = await this.prisma.evaluacionServicio.findMany({
      where: { servicio: { nannieId }, respondidoEn: { not: null } },
      include: { servicio: { select: { fecha: true, familia: { select: { nombreContacto: true } } } } },
      orderBy: { respondidoEn: 'desc' },
    });
    const agg = this.agregado(evals.map((e) => e.calificacion ?? 0));
    return {
      ...agg,
      // Aviso de mes de prueba: promedio bajo el umbral con suficientes respuestas.
      // NO cambia el estado: Paula decide (humaniza la consecuencia).
      alertaPrueba: agg.total >= MIN_RESPUESTAS_ALERTA && agg.promedio != null && agg.promedio < UMBRAL_PRUEBA,
      respuestas: evals.map((e) => ({
        familia: e.servicio.familia.nombreContacto,
        fecha: e.servicio.fecha.toISOString().slice(0, 10),
        calificacion: e.calificacion,
        volveriaContratar: e.volveriaContratar,
        comentario: e.comentario,
      })),
    };
  }

  private agregado(calificaciones: number[]) {
    const total = calificaciones.length;
    const promedio = total ? Math.round((calificaciones.reduce((s, c) => s + c, 0) / total) * 10) / 10 : null;
    return { total, promedio };
  }
}
