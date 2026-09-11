import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EvaluacionCoordService } from './evaluacion-coord.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarEvalCoordDto } from './dto/guardar-eval-coord.dto';

/** M4 (Paula 2026-09-03) · Evaluación de coordinación POR SERVICIO. Solo
 *  coordinación (Directora + Subdirectora). */
@RequiereAccion('nannie.gestionar')
@Controller('evaluaciones-coord')
export class EvaluacionCoordController {
  constructor(private readonly evalCoord: EvaluacionCoordService) {}

  @Get('pilares')
  pilares() {
    return this.evalCoord.pilares();
  }

  @Get('pendientes')
  pendientes() {
    return this.evalCoord.pendientes();
  }

  @Get('servicio/:id')
  deServicio(@Param('id') id: string) {
    return this.evalCoord.deServicio(id);
  }

  @Post('servicio/:id')
  guardarServicio(
    @Param('id') id: string,
    @Body() dto: GuardarEvalCoordDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.evalCoord.guardarServicio(id, dto, user.nombre);
  }

  @Get('paquete/:paqueteId/nannie/:nannieId')
  dePaquete(@Param('paqueteId') paqueteId: string, @Param('nannieId') nannieId: string) {
    return this.evalCoord.dePaquete(paqueteId, nannieId);
  }

  @Post('paquete/:paqueteId/nannie/:nannieId')
  guardarPaquete(
    @Param('paqueteId') paqueteId: string,
    @Param('nannieId') nannieId: string,
    @Body() dto: GuardarEvalCoordDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.evalCoord.guardarPaquete(paqueteId, nannieId, dto, user.nombre);
  }

  @Get('nannie/:nannieId/historial')
  historial(@Param('nannieId') nannieId: string) {
    return this.evalCoord.historialNannie(nannieId);
  }
}
