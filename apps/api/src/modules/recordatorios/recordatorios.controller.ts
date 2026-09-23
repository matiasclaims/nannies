import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { RecordatoriosService } from './recordatorios.service';
import { Publico } from '../../core/auth/decorators/publico.decorator';

/**
 * Disparador de recordatorios. Es público (no lo llama un usuario con sesión,
 * sino el cron del servidor), pero exige un token secreto en la cabecera
 * `x-cron-token` que debe coincidir con RECORDATORIOS_TOKEN del entorno.
 */
@Controller('recordatorios')
export class RecordatoriosController {
  constructor(private readonly recordatorios: RecordatoriosService) {}

  @Publico()
  @Post('disponibilidad')
  disponibilidad(@Headers('x-cron-token') token?: string) {
    const secreto = process.env.RECORDATORIOS_TOKEN;
    if (!secreto || token !== secreto) {
      throw new UnauthorizedException('Token de recordatorio inválido o ausente.');
    }
    return this.recordatorios.disponibilidadSemanal();
  }
}
