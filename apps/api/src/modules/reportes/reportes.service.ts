import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarReporteDto } from './dto/guardar-reporte.dto';

/** M6 · 6.1 — Reporte de servicio. La nannie deja UN reporte por servicio
 *  (actividades, ánimo del niño, incidentes, notas); coordinación lo lee. */
@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Carga el servicio y valida pertenencia: una NANNIE solo toca los suyos. */
  private async exigirServicio(servicioId: string, user: UsuarioAutenticado) {
    const servicio = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      select: { id: true, nannieId: true, estado: true },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (user.rol === 'NANNIE' && servicio.nannieId !== (user.nannieId ?? '__none__')) {
      throw new ForbiddenException('Solo puedes ver o escribir el reporte de tus propios servicios.');
    }
    return servicio;
  }

  /** Crea o actualiza el reporte de un servicio (upsert por servicioId). */
  async guardar(servicioId: string, dto: GuardarReporteDto, user: UsuarioAutenticado) {
    const servicio = await this.exigirServicio(servicioId, user);
    // Solo se reporta un servicio que se aceptó o completó (no ofertas/cancelados).
    if (servicio.estado !== 'ACEPTADO' && servicio.estado !== 'COMPLETADO') {
      throw new BadRequestException('Solo se puede reportar un servicio aceptado o completado.');
    }
    const datos = {
      actividades: dto.actividades.trim(),
      animoNino: dto.animoNino,
      incidentes: dto.incidentes?.trim() || null,
      notas: dto.notas?.trim() || null,
      autorNombre: user.nombre,
    };
    const reporte = await this.prisma.reporteServicio.upsert({
      where: { servicioId },
      create: { servicioId, ...datos },
      update: datos,
    });
    return { ok: true, id: reporte.id };
  }

  /** Lee el reporte de un servicio (null si aún no existe). */
  async deServicio(servicioId: string, user: UsuarioAutenticado) {
    await this.exigirServicio(servicioId, user);
    const r = await this.prisma.reporteServicio.findUnique({ where: { servicioId } });
    if (!r) return null;
    return {
      actividades: r.actividades,
      animoNino: r.animoNino,
      incidentes: r.incidentes,
      notas: r.notas,
      autor: r.autorNombre,
      fecha: r.actualizadoEn.toISOString().slice(0, 10),
    };
  }
}
