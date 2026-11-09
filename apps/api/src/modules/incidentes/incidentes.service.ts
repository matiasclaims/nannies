import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageService } from '../../core/storage/local-storage.service';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarReporteIncidenteDto } from './dto/guardar-reporte-incidente.dto';

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const isoDia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// Documentos de respaldo del reporte (evidencia de que ocurrió el incidente).
export const CATEGORIAS_DOC = ['COMPROBANTE_PAGO', 'ESTUDIOS', 'MEDICAMENTOS', 'OTRO'] as const;
const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por archivo

/** Reporte de incidente de un menor (Paula): documento formal para los papás,
 *  registrado en la ficha de la familia y en el expediente de la nannie. Lo
 *  gestiona solo coordinación (datos médicos sensibles). */
@Injectable()
export class IncidentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

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
    // El cascade borra las filas, pero los binarios del disco hay que quitarlos.
    const docs = await this.prisma.documentoIncidente.findMany({ where: { incidenteId: id }, select: { path: true } });
    await Promise.all(docs.map((d) => this.storage.borrar(d.path)));
    await this.prisma.reporteIncidente.delete({ where: { id } });
    return { ok: true };
  }

  // --- Documentos de respaldo (comprobantes, estudios, medicamentos, etc.) ---

  /** Lista los documentos de un reporte, con URL a su endpoint autenticado. */
  async listarDocumentos(incidenteId: string) {
    await this.exigir(incidenteId);
    const docs = await this.prisma.documentoIncidente.findMany({
      where: { incidenteId },
      orderBy: { subidoEn: 'desc' },
    });
    return docs.map((d) => ({
      id: d.id,
      categoria: d.categoria,
      nombreArchivo: d.nombreArchivo,
      subidoPor: d.subidoPor,
      subidoEn: d.subidoEn.toISOString(),
      url: `/api/incidentes/${incidenteId}/documentos/${d.id}/archivo`,
    }));
  }

  /** Sube un documento de respaldo (base64 data URL). */
  async subirDocumento(
    incidenteId: string,
    dto: { categoria: string; nombreArchivo: string; contenido: string },
    user: UsuarioAutenticado,
  ) {
    await this.exigir(incidenteId);
    if (!CATEGORIAS_DOC.includes(dto.categoria as (typeof CATEGORIAS_DOC)[number])) {
      throw new BadRequestException('Categoría no válida.');
    }
    const m = /^data:([^;]+);base64,(.+)$/s.exec(dto.contenido ?? '');
    if (!m) throw new BadRequestException('Archivo no válido.');
    const ext = MIME_EXT[m[1]];
    if (!ext) throw new BadRequestException('Solo se aceptan PDF, JPG, PNG o WEBP.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_BYTES) throw new BadRequestException('El archivo no debe pasar de 8 MB.');

    const path = `incidencias/${incidenteId}/${randomUUID()}.${ext}`;
    await this.storage.subir(path, buf, m[1]);
    const doc = await this.prisma.documentoIncidente.create({
      data: {
        incidenteId,
        categoria: dto.categoria,
        path,
        nombreArchivo: (dto.nombreArchivo?.trim() || `archivo.${ext}`).slice(0, 200),
        subidoPor: user.nombre,
      },
      select: { id: true },
    });
    return { ok: true, id: doc.id };
  }

  /** Binario de un documento (para servirlo). Valida que sea del reporte dado. */
  async archivoDocumento(incidenteId: string, docId: string) {
    const doc = await this.prisma.documentoIncidente.findFirst({ where: { id: docId, incidenteId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    const buf = await this.storage.leer(doc.path).catch(() => {
      throw new NotFoundException('Archivo no encontrado');
    });
    const ext = (doc.path.split('.').pop() ?? '').toLowerCase();
    const mime =
      ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return { buf, mime, nombre: doc.nombreArchivo };
  }

  /** Borra un documento de respaldo (archivo + fila). */
  async borrarDocumento(incidenteId: string, docId: string) {
    const doc = await this.prisma.documentoIncidente.findFirst({ where: { id: docId, incidenteId } });
    if (doc) {
      await this.storage.borrar(doc.path);
      await this.prisma.documentoIncidente.delete({ where: { id: doc.id } });
    }
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
