import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarReporteDto } from './dto/guardar-reporte.dto';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  // Escribir/actualizar el reporte de un servicio. La nannie (su propio
  // servicio) o coordinación. La pertenencia se valida en el servicio.
  @RequiereAccion('reporte.propio.escribir')
  @Put('servicio/:servicioId')
  guardar(
    @Param('servicioId') servicioId: string,
    @Body() dto: GuardarReporteDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.reportes.guardar(servicioId, dto, user);
  }

  // Leer el reporte de un servicio. Sin @RequiereAccion: cualquier autenticado;
  // la nannie solo ve los suyos (validado en el servicio), coordinación todos.
  @Get('servicio/:servicioId')
  deServicio(@Param('servicioId') servicioId: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.reportes.deServicio(servicioId, user);
  }
}
