import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { RegistrarIncidenciaDto } from './dto/registrar-incidencia.dto';
import { AplicarIncidenciaDto } from './dto/aplicar-incidencia.dto';

@Controller('incidencias')
export class IncidenciasController {
  constructor(private readonly incidencias: IncidenciasService) {}

  // Catálogo de reglas (para el formulario de registro). Coordinación.
  @RequiereAccion('incidencia.registrar')
  @Get('catalogo')
  catalogo() {
    return this.incidencias.catalogo();
  }

  // Bandeja: nannies con incidencias + pendientes + progreso. Coordinación.
  @RequiereAccion('incidencia.registrar')
  @Get('bandeja')
  bandeja() {
    return this.incidencias.bandeja();
  }

  // Bandeja de una nannie (para su expediente). Coordinación.
  @RequiereAccion('incidencia.registrar')
  @Get('nannie/:id')
  bandejaDe(@Param('id') id: string) {
    return this.incidencias.bandejaDe(id);
  }

  // Servicios de la nannie con su pago, para elegir a cuál aplicar el descuento.
  @RequiereAccion('incidencia.descuento.aplicar')
  @Get('nannie/:id/servicios')
  serviciosParaDescuento(@Param('id') id: string) {
    return this.incidencias.serviciosParaDescuento(id);
  }

  // Registrar una incidencia (Directora + Subdirectora).
  @RequiereAccion('incidencia.registrar')
  @Post()
  registrar(@UsuarioActual() user: UsuarioAutenticado, @Body() dto: RegistrarIncidenciaDto) {
    return this.incidencias.registrar(dto, user.nombre);
  }

  // Descartar una ocurrencia. Coordinación.
  @RequiereAccion('incidencia.registrar')
  @Post(':id/descartar')
  descartar(@Param('id') id: string) {
    return this.incidencias.descartar(id);
  }

  // Aplicar una penalización de estado (Baja/Prueba). SOLO Directora.
  @RequiereAccion('incidencia.descuento.aplicar')
  @Post('aplicar')
  aplicar(@Body() dto: AplicarIncidenciaDto) {
    return this.incidencias.aplicar(dto.nannieId, dto.ocurrenciasIds, dto.servicioId, dto.monto);
  }

  // Condonar (dejar pasar) una penalización por strikes: resetea el conteo pero
  // queda en el historial. SOLO Directora.
  @RequiereAccion('incidencia.descuento.aplicar')
  @Post('condonar')
  condonar(@Body() dto: AplicarIncidenciaDto) {
    return this.incidencias.condonar(dto.nannieId, dto.ocurrenciasIds);
  }
}
