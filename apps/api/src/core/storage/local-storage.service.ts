import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

/**
 * Almacenamiento de archivos en el DISCO del servidor (VPS). El binario NO vive
 * en la base de datos. Carpeta base configurable con `STORAGE_DIR` (en producción
 * apunta a una ruta FUERA del repo para que sobreviva a los despliegues).
 */
@Injectable()
export class LocalStorageService {
  private readonly base = process.env.STORAGE_DIR || join(process.cwd(), 'storage', 'expedientes');

  /** Resuelve la ruta absoluta y evita path traversal (no salir de `base`). */
  private full(path: string): string {
    const limpio = normalize(path).replace(/^([./\\])+/, '');
    const full = join(this.base, limpio);
    if (!full.startsWith(this.base)) throw new NotFoundException('Ruta inválida.');
    return full;
  }

  /** Sube (o reemplaza) un archivo. El `mime` se ignora (se infiere al servir). */
  async subir(path: string, contenido: Buffer, _mime?: string): Promise<void> {
    const full = this.full(path);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, contenido);
  }

  /** Borra un archivo (silencioso si no existe). */
  async borrar(path: string): Promise<void> {
    await fs.unlink(this.full(path)).catch(() => undefined);
  }

  /** Lee un archivo (para el endpoint que lo sirve). */
  async leer(path: string): Promise<Buffer> {
    return fs.readFile(this.full(path));
  }

  /** URL (mismo origen) al endpoint autenticado que sirve el archivo privado. */
  urlFirmada(path: string): string {
    return `/api/documentos-archivo?p=${encodeURIComponent(path)}`;
  }
}
