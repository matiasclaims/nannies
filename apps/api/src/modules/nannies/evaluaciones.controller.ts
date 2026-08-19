import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarEvaluacionDto } from './dto/guardar-evaluacion.dto';

/** M4 · Evaluación de desempeño (coordinación: Directora + Subdirectora). */
@Controller('evaluaciones')
export class EvaluacionesController {
  constructor(private readonly evaluaciones: EvaluacionesService) {}

  @RequiereAccion('nannie.gestionar')
  @Get('pilares')
  pilares() {
    return this.evaluaciones.pilares();
  }

  @RequiereAccion('nannie.gestionar')
  @Get('nannie/:id')
  deNannie(@Param('id') id: string, @Query('semana') semana?: string) {
    return this.evaluaciones.deNannie(id, semana);
  }

  @RequiereAccion('nannie.gestionar')
  @Post('nannie/:id')
  guardar(
    @Param('id') id: string,
    @Body() dto: GuardarEvaluacionDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.evaluaciones.guardar(id, dto, user.nombre);
  }
}
