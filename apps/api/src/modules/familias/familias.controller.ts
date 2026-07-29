import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FamiliasService } from './familias.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearFamiliaDto } from './dto/crear-familia.dto';
import { CrearPaqueteDto } from './dto/crear-paquete.dto';
import { CrearNinoDto, EditarNinoDto } from './dto/nino.dto';
import { CrearNotaDto } from './dto/crear-nota.dto';

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

  // Proyección de horas de un paquete (para el PDF que se comparte con la familia).
  @RequiereAccion('familia.gestionar')
  @Get('paquetes/:paqueteId/proyeccion')
  proyeccion(@Param('paqueteId') paqueteId: string) {
    return this.familias.proyeccion(paqueteId);
  }

  @RequiereAccion('familia.gestionar')
  @Post(':id/paquetes')
  crearPaquete(@Param('id') id: string, @Body() dto: CrearPaqueteDto) {
    return this.familias.crearPaquete(id, dto);
  }

  // --- M5 · Niños (perfil de familia) ---
  @RequiereAccion('familia.gestionar')
  @Post(':id/ninos')
  crearNino(@Param('id') id: string, @Body() dto: CrearNinoDto) {
    return this.familias.crearNino(id, dto);
  }

  @RequiereAccion('familia.gestionar')
  @Patch('ninos/:ninoId')
  editarNino(@Param('ninoId') ninoId: string, @Body() dto: EditarNinoDto) {
    return this.familias.editarNino(ninoId, dto);
  }

  @RequiereAccion('familia.gestionar')
  @Delete('ninos/:ninoId')
  eliminarNino(@Param('ninoId') ninoId: string) {
    return this.familias.eliminarNino(ninoId);
  }

  // --- M5 · Bitácora (notas) ---
  @RequiereAccion('familia.gestionar')
  @Post(':id/notas')
  crearNota(
    @Param('id') id: string,
    @Body() dto: CrearNotaDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.familias.crearNota(id, dto, user);
  }

  @RequiereAccion('familia.gestionar')
  @Delete('notas/:notaId')
  eliminarNota(@Param('notaId') notaId: string) {
    return this.familias.eliminarNota(notaId);
  }

  // --- M5 · Perfil (debe ir al final para no capturar rutas más específicas) ---
  @RequiereAccion('familia.gestionar')
  @Get(':id')
  perfil(@Param('id') id: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.familias.perfil(id, user);
  }
}
