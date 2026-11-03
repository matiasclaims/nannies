import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarReporteIncidenteDto } from './dto/guardar-reporte-incidente.dto';

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const isoDia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Reporte de incidente de un menor (Paula): documento formal para los papás,
 *  registrado en la ficha de la familia y en el expediente de la nannie. Lo
 *  gestiona solo coordinación (datos médicos sensibles). */
@Injectable()
export class IncidentesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Convierte el DTO a los datos de Prisma (fechas, decimales, null explícito). */
  private datosDe(dto: GuardarReporteIncidenteDto) {
    const limpio = (s?: string) => {
      const t = (s ?? '').trim();
      return t.length ? t : null;
    };
    return {
      familiaId: dto.familiaId,
      servicioId: dto.servicioId ?? null,
      ninoId: dto.ninoId ?? null,
      nannieId: dto.nannieId ?? null,
      paqueteId: dto.paqueteId ?? null,
      fechaHoraIncidente: new Date(dto.fechaHoraIncidente),
      lugar: dto.lugar.trim(),
      relatoNannie: dto.relatoNannie.trim(),
      medidasInmediatas: limpio(dto.medidasInmediatas),
      evolucionMenor: limpio(dto.evolucionMenor),
      doctor: limpio(dto.doctor),
      fechaConsulta: dto.fechaConsulta ? new Date(dto.fechaConsulta) : null,
      diagnostico: limpio(dto.diagnostico),
      tratamiento: limpio(dto.tratamiento),
      documentacionEntregada: limpio(dto.documentacionEntregada),
      medidasNannies: limpio(dto.medidasNannies),
      coberturaAplico: dto.coberturaAplico,
      coberturaImporte: dto.coberturaAplico ? (dto.coberturaImporte ?? null) : null,
      anexos: limpio(dto.anexos),
    };
  }

  /** Opciones para el formulario: peques y servicios de la familia (con lo que se
   *  autollena al elegir un servicio). */
  async opcionesFamilia(familiaId: string) {
    const familia = await this.prisma.familia.findUnique({
      where: { id: familiaId },
      select: {
        id: true,
        direccion: true,
        ninos: { select: { id: true, nombre: true, apellidos: true }, orderBy: { creadoEn: 'asc' } },
        servicios: {
          orderBy: { fecha: 'desc' },
          take: 60,
          select: {
            id: true,
            fecha: true,
            horaInicio: true,
            tipoServicio: true,
            direccion: true,
            nannieId: true,
            nannie: { select: { nombre: true } },
            paqueteId: true,
            paquete: { select: { folio: true, horasTotales: true, fechaContratacion: true } },
          },
        },
      },
    });
    if (!familia) throw new NotFoundException('Familia no encontrada');
    return {
      ninos: familia.ninos.map((n) => ({ id: n.id, nombre: [n.nombre, n.apellidos].filter(Boolean).join(' ') })),
      servicios: familia.servicios.map((s) => ({
        id: s.id,
        fecha: isoDia(s.fecha)!,
        horaInicio: s.horaInicio,
        etiqueta: `${isoDia(s.fecha)} · ${s.tipoServicio}${s.nannie ? ` · ${s.nannie.nombre}` : ''}`,
        lugar: s.direccion ?? familia.direccion ?? '',
        nannieId: s.nannieId,
        nannieNombre: s.nannie?.nombre ?? null,
        paqueteId: s.paqueteId,
        paqueteResumen: s.paquete
          ? `Paquete #${s.paquete.folio} · ${s.paquete.horasTotales} h · contratado ${isoDia(s.paquete.fechaContratacion)}`
          : null,
      })),
    };
  }

  async crear(dto: GuardarReporteIncidenteDto, user: UsuarioAutenticado) {
    const r = await this.prisma.reporteIncidente.create({
      data: { ...this.datosDe(dto), creadoPor: user.nombre },
      select: { id: true },
    });
    return { ok: true, id: r.id };
  }

  async actualizar(id: string, dto: GuardarReporteIncidenteDto) {
    await this.exigir(id);
    await this.prisma.reporteIncidente.update({ where: { id }, data: this.datosDe(dto) });
    return { ok: true, id };
  }

  async eliminar(id: string) {
    await this.exigir(id);
    await this.prisma.reporteIncidente.delete({ where: { id } });
    return { ok: true };
  }

  private async exigir(id: string) {
    const r = await this.prisma.reporteIncidente.findUnique({ where: { id }, select: { id: true } });
    if (!r) throw new NotFoundException('Reporte de incidente no encontrado');
    return r;
  }

  /** Lista (resumen) de los reportes de una familia. */
  async deFamilia(familiaId: string) {
    const rs = await this.prisma.reporteIncidente.findMany({
      where: { familiaId },
      orderBy: { fechaHoraIncidente: 'desc' },
      select: {
        id: true,
        fechaHoraIncidente: true,
        diagnostico: true,
        coberturaAplico: true,
        nino: { select: { nombre: true, apellidos: true } },
        nannie: { select: { nombre: true } },
      },
    });
    return rs.map((r) => ({
      id: r.id,
      fechaHoraIncidente: iso(r.fechaHoraIncidente)!,
      menor: r.nino ? [r.nino.nombre, r.nino.apellidos].filter(Boolean).join(' ') : '—',
      nannie: r.nannie?.nombre ?? '—',
      diagnostico: r.diagnostico ?? null,
      coberturaAplico: r.coberturaAplico,
    }));
  }

  /** Lista (resumen) de los reportes donde participó una nannie. */
  async deNannie(nannieId: string) {
    const rs = await this.prisma.reporteIncidente.findMany({
      where: { nannieId },
      orderBy: { fechaHoraIncidente: 'desc' },
      select: {
        id: true,
        fechaHoraIncidente: true,
        diagnostico: true,
        coberturaAplico: true,
        nino: { select: { nombre: true, apellidos: true } },
        familia: { select: { nombreContacto: true } },
      },
    });
    return rs.map((r) => ({
      id: r.id,
      fechaHoraIncidente: iso(r.fechaHoraIncidente)!,
      menor: r.nino ? [r.nino.nombre, r.nino.apellidos].filter(Boolean).join(' ') : '—',
      familia: r.familia.nombreContacto,
      diagnostico: r.diagnostico ?? null,
      coberturaAplico: r.coberturaAplico,
    }));
  }

  /** Detalle completo de un reporte (para editar y para la hoja imprimible). */
  async uno(id: string) {
    const r = await this.prisma.reporteIncidente.findUnique({
      where: { id },
      include: {
        familia: { select: { nombreContacto: true } },
        nino: { select: { id: true, nombre: true, apellidos: true } },
        nannie: { select: { id: true, nombre: true } },
        paquete: { select: { id: true, folio: true, horasTotales: true, fechaContratacion: true } },
      },
    });
    if (!r) throw new NotFoundException('Reporte de incidente no encontrado');
    return {
      id: r.id,
      familiaId: r.familiaId,
      familia: r.familia.nombreContacto,
      servicioId: r.servicioId,
      ninoId: r.ninoId,
      menor: r.nino ? [r.nino.nombre, r.nino.apellidos].filter(Boolean).join(' ') : '—',
      nannieId: r.nannieId,
      nannie: r.nannie?.nombre ?? '—',
      paqueteId: r.paqueteId,
      paquete: r.paquete
        ? {
            folio: r.paquete.folio,
            horasTotales: r.paquete.horasTotales,
            fechaContratacion: isoDia(r.paquete.fechaContratacion)!,
          }
        : null,
      fechaHoraIncidente: iso(r.fechaHoraIncidente)!,
      lugar: r.lugar,
      relatoNannie: r.relatoNannie,
      medidasInmediatas: r.medidasInmediatas,
      evolucionMenor: r.evolucionMenor,
      doctor: r.doctor,
      fechaConsulta: isoDia(r.fechaConsulta),
      diagnostico: r.diagnostico,
      tratamiento: r.tratamiento,
      documentacionEntregada: r.documentacionEntregada,
      medidasNannies: r.medidasNannies,
      coberturaAplico: r.coberturaAplico,
      coberturaImporte: r.coberturaImporte != null ? Number(r.coberturaImporte) : null,
      anexos: r.anexos,
      creadoPor: r.creadoPor,
      creadoEn: iso(r.creadoEn)!,
    };
  }
}
