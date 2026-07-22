import { Body, Controller, Post } from '@nestjs/common';
import { AsignacionService } from './asignacion.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { RecomendarDto } from './dto/recomendar.dto';
import { AsignarDto } from './dto/asignar.dto';

@Controller('asignacion')
export class AsignacionController {
  constructor(private readonly asignacion: AsignacionService) {}

  // Pedir el ranking de nannies para un servicio propuesto.
  @RequiereAccion('servicio.asignar')
  @Post('recomendar')
  recomendar(@Body() dto: RecomendarDto) {
    return this.asignacion.recomendar(dto);
  }

  // Confirmar: crea el servicio y lo oferta a la nannie elegida (o override).
  @RequiereAccion('servicio.asignar')
  @Post('asignar')
  asignar(@Body() dto: AsignarDto) {
    return this.asignacion.asignar(dto);
  }
}
