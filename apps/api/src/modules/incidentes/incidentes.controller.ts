import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IncidentesService } from './incidentes.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarReporteIncidenteDto } from './dto/guardar-reporte-incidente.dto';

// Reporte de incidente de un menor. TODO el recurso es coordinación-only
// (datos médicos del menor = PII sensible); la nannie NO lo ve.
@Controller('incidentes')
export class IncidentesController {
  constructor(private readonly incidentes: IncidentesService) {}

  // Opciones del formulario (peques + servicios de la familia, con autollenado).
  @RequiereAccion('incidente.gestionar')
  @Get('opciones/familia/:familiaId')
  opcionesFamilia(@Param('familiaId') familiaId: string) {
    return this.incidentes.opcionesFamilia(familiaId);
  }

  // Lista de reportes de una familia (ficha de la familia).
  @RequiereAccion('incidente.gestionar')
  @Get('familia/:familiaId')
  deFamilia(@Param('familiaId') familiaId: string) {
    return this.incidentes.deFamilia(familiaId);
  }

  // Lista de reportes donde participó una nannie (expediente de la nannie).
  @RequiereAccion('incidente.gestionar')
  @Get('nannie/:nannieId')
  deNannie(@Param('nannieId') nannieId: string) {
    return this.incidentes.deNannie(nannieId);
  }

  // Detalle de un reporte (para editar y para la hoja imprimible).
  @RequiereAccion('incidente.gestionar')
  @Get(':id')
  uno(@Param('id') id: string) {
    return this.incidentes.uno(id);
  }

  @RequiereAccion('incidente.gestionar')
  @Post()
  crear(@Body() dto: GuardarReporteIncidenteDto, @UsuarioActual() user: UsuarioAutenticado) {
    return this.incidentes.crear(dto, user);
  }

  @RequiereAccion('incidente.gestionar')
  @Put(':id')
  actualizar(@Param('id') id: string, @Body() dto: GuardarReporteIncidenteDto) {
    return this.incidentes.actualizar(id, dto);
  }

  @RequiereAccion('incidente.gestionar')
  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.incidentes.eliminar(id);
  }
}
