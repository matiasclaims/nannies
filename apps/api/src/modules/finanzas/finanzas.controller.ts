import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { EditarFinanzaDto } from './dto/editar-finanza.dto';
import { CerrarMesDto } from './dto/cerrar-mes.dto';
import { CrearBonoDto } from './dto/crear-bono.dto';
import { MarcarPagoDto } from './dto/marcar-pago.dto';

@Controller('finanzas')
export class FinanzasController {
  constructor(private readonly finanzas: FinanzasService) {}

  // 3.2 · Ingresos (cobro a familias). Operativo: Directora + Subdirectora.
  @RequiereAccion('finanzas.ver')
  @Get('ingresos')
  ingresos(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.finanzas.ingresos(desde, hasta);
  }

  // 3.1 · Nómina semanal (pago a nannies). Operativo: Directora + Subdirectora.
  @RequiereAccion('finanzas.ver')
  @Get('nomina')
  nomina(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.finanzas.nomina(desde, hasta);
  }

  // Marca/desmarca como pagada la nómina de una nannie (por semana). Operativo.
  @RequiereAccion('finanzas.pago.marcar')
  @Post('nomina/pago')
  marcarPago(@Body() dto: MarcarPagoDto) {
    return this.finanzas.marcarPago(dto.nannieId, dto.semana, dto.pagado);
  }

  // 3.4 · Margen por servicio. SOLO Directora (información sensible).
  @RequiereAccion('finanzas.margen.ver')
  @Get('margen')
  margen(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.finanzas.margen(desde, hasta);
  }

  // 3.3 · Fijar comisión / ajuste de un servicio. SOLO Directora.
  @RequiereAccion('finanzas.comision.fijar')
  @Patch('servicios/:servicioId')
  editarFinanza(@Param('servicioId') servicioId: string, @Body() dto: EditarFinanzaDto) {
    return this.finanzas.editarFinanza(servicioId, dto);
  }

  // Cierre de mes: niveles vigentes + historial de cierres. Operativo.
  @RequiereAccion('finanzas.ver')
  @Get('niveles')
  niveles() {
    return this.finanzas.niveles();
  }

  // Ejecuta el cierre de un mes (fija el nivel del mes entrante). SOLO Directora.
  @RequiereAccion('finanzas.cierre.ejecutar')
  @Post('cierre-mes')
  cerrarMes(@Body() dto: CerrarMesDto) {
    return this.finanzas.cerrarMes(dto.anio, dto.mes);
  }

  // Bono manual a una nannie (reduce el margen). SOLO Directora.
  @RequiereAccion('finanzas.comision.fijar')
  @Post('bonos')
  crearBono(@Body() dto: CrearBonoDto) {
    return this.finanzas.crearBono(dto);
  }

  @RequiereAccion('finanzas.comision.fijar')
  @Delete('bonos/:id')
  eliminarBono(@Param('id') id: string) {
    return this.finanzas.eliminarBono(id);
  }
}
