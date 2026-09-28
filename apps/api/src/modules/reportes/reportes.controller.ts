import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarReporteDto } from './dto/guardar-reporte.dto';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  // Reporte general (M6): una fila por nannie con su actividad del periodo.
  // Coordinación (Directora/Subdirectora).
  @RequiereAccion('reporte.gestionar')
  @Get('general')
  general(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.reportes.general(desde, hasta);
  }

  // Reporte detallado de una nannie en el periodo. Coordinación.
  @RequiereAccion('reporte.gestionar')
  @Get('nannie/:nannieId')
  detalleNannie(@Param('nannieId') nannieId: string, @Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.reportes.detalleNannie(nannieId, desde, hasta);
  }

  // Reportes del DÍA (Panorama): servicios asignados + su reporte. Coordinación.
  @RequiereAccion('reporte.gestionar')
  @Get('dia')
  reportesDelDia(@Query('fecha') fecha: string) {
    return this.reportes.reportesDelDia(fecha);
  }

  // Hoja imprimible del reporte de UN servicio (para enviar al papá). Coordinación.
  @RequiereAccion('reporte.gestionar')
  @Get('servicio/:servicioId/hoja')
  hojaReporte(@Param('servicioId') servicioId: string) {
    return this.reportes.hojaReporte(servicioId);
  }

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
