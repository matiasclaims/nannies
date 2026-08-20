import { Injectable, InternalServerErrorException } from '@nestjs/common';

/**
 * Almacenamiento de archivos en Supabase Storage (bucket privado). El binario
 * NO vive en la base de datos. Usa la REST API de Storage con la service_role
 * key (solo servidor). Config por env: SUPABASE_URL, SUPABASE_SERVICE_KEY.
 */
const BUCKET = 'expedientes';

@Injectable()
export class SupabaseStorageService {
  private get url(): string {
    return (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  }
  private get key(): string {
    return process.env.SUPABASE_SERVICE_KEY ?? '';
  }
  get configurado(): boolean {
    return !!this.url && !!this.key;
  }
  private headers(extra?: Record<string, string>): Record<string, string> {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, ...(extra ?? {}) };
  }

  /** Crea el bucket privado si no existe (idempotente). */
  private async asegurarBucket(): Promise<void> {
    await fetch(`${this.url}/storage/v1/bucket`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
    }).catch(() => undefined);
  }

  /** Sube (o reemplaza) un archivo. */
  async subir(path: string, contenido: Buffer, mime: string): Promise<void> {
    if (!this.configurado) {
      throw new InternalServerErrorException(
        'Almacenamiento no configurado (falta SUPABASE_URL / SUPABASE_SERVICE_KEY).',
      );
    }
    await this.asegurarBucket();
    const res = await fetch(`${this.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': mime, 'x-upsert': 'true' }),
      body: contenido as unknown as BodyInit,
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`No se pudo subir el archivo (${res.status}).`);
    }
  }

  /** URL firmada temporal para descargar/ver un archivo privado. */
  async urlFirmada(path: string, segundos = 3600): Promise<string | null> {
    if (!this.configurado) return null;
    const res = await fetch(`${this.url}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn: segundos }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { signedURL?: string };
    return data.signedURL ? `${this.url}/storage/v1${data.signedURL}` : null;
  }

  /** Borra un archivo. */
  async borrar(path: string): Promise<void> {
    if (!this.configurado) return;
    await fetch(`${this.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    }).catch(() => undefined);
  }
}
