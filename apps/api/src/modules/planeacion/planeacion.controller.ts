import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { PlaneacionService } from './planeacion.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarPlaneacionDto } from './dto/guardar-planeacion.dto';

@Controller('planeacion')
export class PlaneacionController {
  constructor(private readonly planeacion: PlaneacionService) {}

  // Guardar/actualizar la planeación de un servicio. Coordinación o la nannie
  // asignada (la pertenencia se valida en el servicio).
  @RequiereAccion('planeacion.gestionar')
  @Put('servicio/:servicioId')
  guardar(
    @Param('servicioId') servicioId: string,
    @Body() dto: GuardarPlaneacionDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.planeacion.guardar(servicioId, dto, user);
  }

  // Leer la planeación de un servicio (null si no existe).
  @RequiereAccion('planeacion.gestionar')
  @Get('servicio/:servicioId')
  deServicio(@Param('servicioId') servicioId: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.planeacion.deServicio(servicioId, user);
  }

  // Hoja imprimible (PDF con marca Nannies) de la planeación de un servicio.
  @RequiereAccion('planeacion.gestionar')
  @Get('servicio/:servicioId/hoja')
  hoja(@Param('servicioId') servicioId: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.planeacion.hoja(servicioId, user);
  }
}
