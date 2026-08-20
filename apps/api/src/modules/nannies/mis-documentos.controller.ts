import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { SubirDocumentoDto } from './dto/subir-documento.dto';

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

  @Delete(':clave')
  borrar(@UsuarioActual() user: UsuarioAutenticado, @Param('clave') clave: string) {
    return this.documentos.borrar(this.nannieId(user), clave);
  }
}
