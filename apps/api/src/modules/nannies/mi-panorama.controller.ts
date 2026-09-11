import { Controller, Get } from '@nestjs/common';
import { MiPanoramaService } from './mi-panorama.service';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';

/** M7 · Panorama personal de la nannie (lo que ve de sí misma en su inicio). */
@Controller()
export class MiPanoramaController {
  constructor(private readonly miPanorama: MiPanoramaService) {}

  @Get('mi-panorama')
  mio(@UsuarioActual() user: UsuarioAutenticado) {
    return this.miPanorama.para(user.nannieId);
  }

  @Get('mi-proyeccion')
  miProyeccion(@UsuarioActual() user: UsuarioAutenticado) {
    return this.miPanorama.proyeccion(user.nannieId);
  }

  @Get('mis-paquetes')
  misPaquetes(@UsuarioActual() user: UsuarioAutenticado) {
    return this.miPanorama.misPaquetes(user.nannieId);
  }
}
