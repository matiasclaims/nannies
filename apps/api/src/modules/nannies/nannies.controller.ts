import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NanniesService } from './nannies.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearNannieDto } from './dto/crear-nannie.dto';
import { EditarNannieDto } from './dto/editar-nannie.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { ActualizarFotoDto } from '../../core/auth/dto/actualizar-foto.dto';

@Controller('nannies')
export class NanniesController {
  constructor(private readonly nannies: NanniesService) {}

  // Cambio de contraseña propio (cualquier usuario autenticado, sobre lo suyo).
  @Post('mi-password')
  cambiarPassword(@UsuarioActual() user: UsuarioAutenticado, @Body() dto: CambiarPasswordDto) {
    return this.nannies.cambiarPassword(user, dto);
  }

  // --- Expediente (M4): coordinación (Directora + Subdirectora) ---
  @RequiereAccion('nannie.gestionar')
  @Get()
  listar() {
    return this.nannies.listar();
  }

  @RequiereAccion('nannie.gestionar')
  @Get(':id')
  perfil(@Param('id') id: string) {
    return this.nannies.perfil(id);
  }

  @RequiereAccion('nannie.gestionar')
  @Post()
  crear(@Body() dto: CrearNannieDto) {
    return this.nannies.crear(dto);
  }

  @RequiereAccion('nannie.gestionar')
  @Patch(':id')
  editar(@Param('id') id: string, @Body() dto: EditarNannieDto) {
    return this.nannies.editar(id, dto);
  }

  @RequiereAccion('nannie.gestionar')
  @Patch(':id/foto')
  actualizarFoto(@Param('id') id: string, @Body() dto: ActualizarFotoDto) {
    return this.nannies.actualizarFoto(id, dto.foto ?? null);
  }

  @RequiereAccion('nannie.gestionar')
  @Post(':id/baja')
  darDeBaja(@Param('id') id: string) {
    return this.nannies.darDeBaja(id);
  }
}
