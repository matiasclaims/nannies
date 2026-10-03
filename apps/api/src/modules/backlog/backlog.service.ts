import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearBacklogDto } from './dto/crear-backlog.dto';
import { ActualizarBacklogDto } from './dto/actualizar-backlog.dto';

type BacklogRow = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  estado: string;
  origenReporteId: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
};

const serializar = (b: BacklogRow) => ({
  id: b.id,
  titulo: b.titulo,
  descripcion: b.descripcion,
  prioridad: b.prioridad,
  estado: b.estado,
  origenReporteId: b.origenReporteId,
  creadoEn: b.creadoEn.toISOString(),
  actualizadoEn: b.actualizadoEn.toISOString(),
});

/** Backlog del PROGRAMADOR: pendientes de desarrollo (CRUD simple). */
@Injectable()
export class BacklogService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(estado?: string) {
    const where = estado && estado !== 'TODOS' ? { estado: estado as never } : {};
    const items = await this.prisma.backlogItem.findMany({ where, orderBy: { creadoEn: 'desc' }, take: 500 });
    return items.map(serializar);
  }

  async crear(dto: CrearBacklogDto) {
    const item = await this.prisma.backlogItem.create({
      data: {
        titulo: dto.titulo.trim().slice(0, 200),
        descripcion: dto.descripcion?.trim().slice(0, 3000) || null,
        prioridad: (dto.prioridad ?? 'MEDIA') as never,
        origenReporteId: dto.origenReporteId ?? null,
      },
    });
    return serializar(item);
  }

  async actualizar(id: string, dto: ActualizarBacklogDto) {
    const existe = await this.prisma.backlogItem.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException('Ítem de backlog no encontrado');
    const item = await this.prisma.backlogItem.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim().slice(0, 200) } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion.trim().slice(0, 3000) || null } : {}),
        ...(dto.prioridad !== undefined ? { prioridad: dto.prioridad as never } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado as never } : {}),
      },
    });
    return serializar(item);
  }

  async borrar(id: string) {
    await this.prisma.backlogItem.deleteMany({ where: { id } });
    return { ok: true as const };
  }
}
