import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseStorageService } from '../../core/storage/supabase-storage.service';
import { CLAVES_DOCUMENTOS, CLAVES_CURSOS } from './catalogos';

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por archivo

/** M4 · Documentos del expediente: la nannie los sube; coordinación los revisa.
 *  El binario vive en Supabase Storage; aquí la referencia + la URL firmada. */
@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
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
    const ext = MIME_EXT[mime];
    if (!ext) throw new BadRequestException('Solo se aceptan PDF, JPG, PNG o WEBP.');
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
}
