import { Controller, ForbiddenException, Get, NotFoundException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LocalStorageService } from './local-storage.service';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

/**
 * Sirve un archivo privado de expediente desde el disco. Autenticado (guard
 * global): la NANNIE solo los suyos (prefijo de la ruta = su nannieId);
 * coordinación puede ver todos.
 */
@Controller('documentos-archivo')
export class ArchivosController {
  constructor(private readonly storage: LocalStorageService) {}

  @Get()
  async servir(@Query('p') p: string, @UsuarioActual() user: UsuarioAutenticado, @Res() res: Response) {
    if (!p || p.includes('..')) throw new NotFoundException('Archivo no encontrado.');
    const nannieId = p.split('/')[0];
    if (user.rol === 'NANNIE' && user.nannieId !== nannieId) {
      throw new ForbiddenException('Solo puedes ver tus propios documentos.');
    }
    const buf = await this.storage.leer(p).catch(() => {
      throw new NotFoundException('Archivo no encontrado.');
    });
    const ext = (p.split('.').pop() ?? '').toLowerCase();
    const mime =
      ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', 'inline');
    res.send(buf);
  }
}
