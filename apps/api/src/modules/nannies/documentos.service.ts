import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoReferencia } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageService } from '../../core/storage/local-storage.service';
import { CLAVES_DOCUMENTOS, CLAVES_CURSOS } from './catalogos';

export interface ReferenciaEntrada {
  tipo: TipoReferencia;
  orden: number;
  nombre?: string;
  telefono?: string;
  aniosConocer?: number;
  empresa?: string;
  puesto?: string;
  parentesco?: string;
}

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
// Excel: solo se admite para el 'Formato de zonas'.
const MIME_EXT_EXCEL: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por archivo

/** M4 · Documentos del expediente: la nannie los sube; coordinación los revisa.
 *  El binario vive en el disco del servidor (LocalStorageService); aquí la
 *  referencia en BD + la URL al endpoint que lo sirve autenticado. */
@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  private tipoDeClave(clave: string): 'DOCUMENTO' | 'CURSO' | null {
    if (CLAVES_DOCUMENTOS.includes(clave)) return 'DOCUMENTO';
    if (CLAVES_CURSOS.includes(clave)) return 'CURSO';
    return null;
  }

  /** Lista de documentos subidos por una nannie, con URL firmada temporal. */
  async listar(nannieId: string) {
    const docs = await this.prisma.documentoNannie.findMany({
      where: { nannieId },
      orderBy: { subidoEn: 'desc' },
    });
    return Promise.all(
      docs.map(async (d) => ({
        clave: d.clave,
        tipo: d.tipo,
        nombreArchivo: d.nombreArchivo,
        subidoEn: d.subidoEn.toISOString(),
        url: await this.storage.urlFirmada(d.path),
      })),
    );
  }

  /** Sube (o reemplaza) el documento de una clave del catálogo. */
  async subir(nannieId: string, clave: string, nombreArchivo: string, contenido: string) {
    const tipo = this.tipoDeClave(clave);
    if (!tipo) throw new BadRequestException('Documento no reconocido.');
    const m = /^data:([^;]+);base64,(.+)$/s.exec(contenido);
    if (!m) throw new BadRequestException('Archivo no válido.');
    const mime = m[1];
    // El 'Formato de zonas' también admite Excel; el resto solo PDF/imagen.
    const admiteExcel = clave === 'formato_zonas';
    const ext = MIME_EXT[mime] ?? (admiteExcel ? MIME_EXT_EXCEL[mime] : undefined);
    if (!ext) {
      throw new BadRequestException(
        admiteExcel
          ? 'Solo se aceptan PDF, imagen o Excel.'
          : 'Solo se aceptan PDF, JPG, PNG o WEBP.',
      );
    }
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_BYTES) throw new BadRequestException('El archivo no debe pasar de 8 MB.');
    const nannie = await this.prisma.nannie.findUnique({ where: { id: nannieId }, select: { id: true } });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');

    const path = `${nannieId}/${clave}.${ext}`;
    const previo = await this.prisma.documentoNannie.findUnique({
      where: { nannieId_clave: { nannieId, clave } },
    });
    await this.storage.subir(path, buf, mime);
    // Si cambió la extensión, borra el archivo anterior (evita huérfanos).
    if (previo && previo.path !== path) await this.storage.borrar(previo.path);
    await this.prisma.documentoNannie.upsert({
      where: { nannieId_clave: { nannieId, clave } },
      update: { path, nombreArchivo: nombreArchivo.slice(0, 200), tipo, subidoEn: new Date() },
      create: { nannieId, clave, tipo, path, nombreArchivo: nombreArchivo.slice(0, 200) },
    });
    return { ok: true };
  }

  /** Quita el documento de una clave. */
  async borrar(nannieId: string, clave: string) {
    const doc = await this.prisma.documentoNannie.findUnique({
      where: { nannieId_clave: { nannieId, clave } },
    });
    if (doc) {
      await this.storage.borrar(doc.path);
      await this.prisma.documentoNannie.delete({ where: { id: doc.id } });
    }
    return { ok: true };
  }

  /** Referencias (laborales/personales) capturadas por la nannie. */
  async listarReferencias(nannieId: string) {
    return this.prisma.referenciaNannie.findMany({
      where: { nannieId },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }],
      select: {
        tipo: true,
        orden: true,
        nombre: true,
        telefono: true,
        aniosConocer: true,
        empresa: true,
        puesto: true,
        parentesco: true,
      },
    });
  }

  /** Guarda (upsert) las referencias que envía la nannie (hasta 2 por tipo). */
  async guardarReferencias(nannieId: string, referencias: ReferenciaEntrada[]) {
    const nannie = await this.prisma.nannie.findUnique({
      where: { id: nannieId },
      select: { id: true },
    });
    if (!nannie) throw new NotFoundException('Nannie no encontrada');
    const limpio = (s?: string) => (s?.trim() ? s.trim().slice(0, 120) : null);
    const datos = (r: ReferenciaEntrada) => ({
      nombre: limpio(r.nombre),
      telefono: limpio(r.telefono),
      aniosConocer: r.aniosConocer ?? null,
      empresa: r.tipo === 'LABORAL' ? limpio(r.empresa) : null,
      puesto: r.tipo === 'LABORAL' ? limpio(r.puesto) : null,
      parentesco: r.tipo === 'PERSONAL' ? limpio(r.parentesco) : null,
    });
    await this.prisma.$transaction(
      referencias.map((r) =>
        this.prisma.referenciaNannie.upsert({
          where: { nannieId_tipo_orden: { nannieId, tipo: r.tipo, orden: r.orden } },
          update: datos(r),
          create: { nannieId, tipo: r.tipo, orden: r.orden, ...datos(r) },
        }),
      ),
    );
    return this.listarReferencias(nannieId);
  }
}
