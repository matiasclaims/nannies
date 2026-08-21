import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { NanniesService } from './nannies.service';
import { DocumentosService } from './documentos.service';
import { ColoniasService } from './colonias.service';
import { GuardarColoniasDto } from './dto/guardar-colonias.dto';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearNannieDto } from './dto/crear-nannie.dto';
import { EditarNannieDto } from './dto/editar-nannie.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { ActualizarFotoDto } from '../../core/auth/dto/actualizar-foto.dto';
import { AgregarNotaDto } from './dto/agregar-nota.dto';

@Controller('nannies')
export class NanniesController {
  constructor(
    private readonly nannies: NanniesService,
    private readonly documentos: DocumentosService,
    private readonly colonias: ColoniasService,
  ) {}

  // Documentos que subió la nannie (coordinación los revisa/descarga).
  @RequiereAccion('nannie.gestionar')
  @Get(':id/documentos')
  documentosDe(@Param('id') id: string) {
    return this.documentos.listar(id);
  }

  // Colonias de trabajo de la nannie (coordinación las ve y edita, y puede
  // fijar/levantar el candado que impide que la nannie las cambie sola).
  @RequiereAccion('nannie.gestionar')
  @Get(':id/colonias')
  coloniasDe(@Param('id') id: string) {
    return this.colonias.deNannie(id);
  }

  @RequiereAccion('nannie.gestionar')
  @Put(':id/colonias')
  guardarColonias(@Param('id') id: string, @Body() dto: GuardarColoniasDto) {
    return this.colonias.guardarCoordinacion(id, dto);
  }

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

  // --- Bitácora de coordinación (Directora + Subdirectora) ---
  @RequiereAccion('nannie.gestionar')
  @Get(':id/notas')
  listarNotas(@Param('id') id: string) {
    return this.nannies.listarNotas(id);
  }

  @RequiereAccion('nannie.gestionar')
  @Post(':id/notas')
  agregarNota(
    @Param('id') id: string,
    @Body() dto: AgregarNotaDto,
    @UsuarioActual() user: UsuarioAutenticado,
  ) {
    return this.nannies.agregarNota(id, dto.texto, user.nombre);
  }

  @RequiereAccion('nannie.gestionar')
  @Delete('notas/:notaId')
  borrarNota(@Param('notaId') notaId: string) {
    return this.nannies.borrarNota(notaId);
  }
}
