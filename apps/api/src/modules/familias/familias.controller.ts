import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FamiliasService } from './familias.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { CrearFamiliaDto } from './dto/crear-familia.dto';
import { CrearPaqueteDto } from './dto/crear-paquete.dto';

@Controller('familias')
export class FamiliasController {
  constructor(private readonly familias: FamiliasService) {}

  @RequiereAccion('familia.gestionar')
  @Get()
  listar() {
    return this.familias.listar();
  }

  @RequiereAccion('familia.gestionar')
  @Post()
  crear(@Body() dto: CrearFamiliaDto) {
    return this.familias.crear(dto);
  }

  @RequiereAccion('familia.gestionar')
  @Post(':id/paquetes')
  crearPaquete(@Param('id') id: string, @Body() dto: CrearPaqueteDto) {
    return this.familias.crearPaquete(id, dto);
  }
}
