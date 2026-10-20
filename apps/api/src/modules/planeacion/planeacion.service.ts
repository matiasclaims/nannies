import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarPlaneacionDto } from './dto/guardar-planeacion.dto';

/** Fila ya limpia de la planeación (lo que se guarda y se devuelve). */
export interface ItemLimpio {
  hora: string;
  actividad: string;
  objetivo: string;
  material: string;
}

/** Planeación estructurada de un servicio (Hora/Actividad/Objetivo/Material).
 *  La capturan coordinación y la nannie asignada; queda ligada al servicio. */
@Injectable()
export class PlaneacionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Carga el servicio y valida pertenencia: una NANNIE solo toca los suyos. */
  private async exigirServicio(servicioId: string, user: UsuarioAutenticado) {
    const servicio = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      select: { id: true, nannieId: true },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (user.rol === 'NANNIE' && servicio.nannieId !== (user.nannieId ?? '__none__')) {
      throw new ForbiddenException('Solo puedes ver o escribir la planeación de tus propios servicios.');
    }
    return servicio;
  }

  /** Normaliza las filas: recorta, descarta las vacías (sin actividad). */
  private limpiar(items: GuardarPlaneacionDto['items']): ItemLimpio[] {
    return items
      .map((i) => ({
        hora: (i.hora ?? '').trim(),
        actividad: (i.actividad ?? '').trim(),
        objetivo: (i.objetivo ?? '').trim(),
        material: (i.material ?? '').trim(),
      }))
      .filter((i) => i.actividad.length > 0);
  }

  /** Crea o actualiza la planeación de un servicio (upsert por servicioId). */
  async guardar(servicioId: string, dto: GuardarPlaneacionDto, user: UsuarioAutenticado) {
    await this.exigirServicio(servicioId, user);
    const items = this.limpiar(dto.items);
    if (items.length === 0) {
      throw new BadRequestException('Agrega al menos una actividad a la planeación.');
    }
    const datos = { items: items as unknown as Prisma.InputJsonValue, autorNombre: user.nombre };
    const plan = await this.prisma.planeacionServicio.upsert({
      where: { servicioId },
      create: { servicioId, ...datos },
      update: datos,
    });
    return { ok: true, id: plan.id };
  }

  /** Lee la planeación de un servicio (null si aún no existe). */
  async deServicio(servicioId: string, user: UsuarioAutenticado) {
    await this.exigirServicio(servicioId, user);
    return this.leer(servicioId);
  }

  private async leer(servicioId: string) {
    const p = await this.prisma.planeacionServicio.findUnique({ where: { servicioId } });
    if (!p) return null;
    return {
      items: (p.items as unknown as ItemLimpio[]) ?? [],
      autor: p.autorNombre,
      fecha: p.actualizadoEn.toISOString().slice(0, 10),
    };
  }

  /** Datos completos de UN servicio + su planeación para la HOJA imprimible. */
  async hoja(servicioId: string, user: UsuarioAutenticado) {
    await this.exigirServicio(servicioId, user);
    const s = await this.prisma.servicio.findUnique({
      where: { id: servicioId },
      include: {
        nannie: { select: { nombre: true } },
        familia: { select: { nombreContacto: true, ninos: { select: { nombre: true }, orderBy: { creadoEn: 'asc' } } } },
      },
    });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    return {
      servicioId: s.id,
      familia: s.familia.nombreContacto,
      ninos: s.familia.ninos.map((n) => n.nombre).filter(Boolean),
      nannie: s.nannie?.nombre ?? '—',
      plaza: s.plaza,
      tipoServicio: s.tipoServicio,
      esPaquete: s.paqueteId != null,
      fecha: s.fecha.toISOString().slice(0, 10),
      horaInicio: s.horaInicio,
      horaFin: s.horaFin,
      zona: s.zona,
      planeacion: await this.leer(servicioId),
    };
  }
}
