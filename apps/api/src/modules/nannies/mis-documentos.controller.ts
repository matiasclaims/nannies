import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { GuardarReferenciasDto } from './dto/guardar-referencias.dto';
import { GuardarFichaPersonalDto } from './dto/guardar-ficha-personal.dto';

/** La nannie sube/gestiona SUS propios documentos (sobre lo suyo). */
@Controller('mis-documentos')
export class MisDocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  private nannieId(user: UsuarioAutenticado | undefined): string {
    if (!user) throw new UnauthorizedException();
    if (!user.nannieId) throw new ForbiddenException('Solo una nannie tiene expediente propio.');
    return user.nannieId;
  }

  @Get()
  listar(@UsuarioActual() user: UsuarioAutenticado) {
    return this.documentos.listar(this.nannieId(user));
  }

  @Post()
  subir(@UsuarioActual() user: UsuarioAutenticado, @Body() dto: SubirDocumentoDto) {
    return this.documentos.subir(this.nannieId(user), dto.clave, dto.nombreArchivo, dto.contenido);
  }

  // --- Referencias (laborales/personales): datos, no archivos ---
  @Get('referencias')
  listarReferencias(@UsuarioActual() user: UsuarioAutenticado) {
    return this.documentos.listarReferencias(this.nannieId(user));
  }

  @Put('referencias')
  guardarReferencias(
    @UsuarioActual() user: UsuarioAutenticado,
    @Body() dto: GuardarReferenciasDto,
  ) {
    return this.documentos.guardarReferencias(this.nannieId(user), dto.referencias);
  }

  // --- Ficha personal: contacto de emergencia y consideraciones de salud ---
  @Get('ficha')
  obtenerFicha(@UsuarioActual() user: UsuarioAutenticado) {
    return this.documentos.obtenerFichaPersonal(this.nannieId(user));
  }

  @Put('ficha')
  guardarFicha(@UsuarioActual() user: UsuarioAutenticado, @Body() dto: GuardarFichaPersonalDto) {
    return this.documentos.guardarFichaPersonal(this.nannieId(user), dto);
  }

  @Delete(':clave')
  borrar(@UsuarioActual() user: UsuarioAutenticado, @Param('clave') clave: string) {
    return this.documentos.borrar(this.nannieId(user), clave);
  }
}
