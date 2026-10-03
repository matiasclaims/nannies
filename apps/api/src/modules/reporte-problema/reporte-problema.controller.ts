import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ReporteProblemaService } from './reporte-problema.service';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearReporteProblemaDto } from './dto/crear-reporte-problema.dto';
import { ResolverProblemaDto } from './dto/resolver-problema.dto';

/** Cualquier usuario autenticado puede reportar; solo PROGRAMADOR los gestiona. */
@Controller('reportes-problema')
export class ReporteProblemaController {
  constructor(private readonly servicio: ReporteProblemaService) {}

  @Post()
  crear(@UsuarioActual() user: UsuarioAutenticado | undefined, @Body() dto: CrearReporteProblemaDto) {
    if (!user) throw new UnauthorizedException();
    return this.servicio.crear(user, dto);
  }

  // --- Gestión (perfil PROGRAMADOR) ---
  @Get()
  @RequiereAccion('problema.gestionar')
  listar(@Query('estado') estado?: string) {
    return this.servicio.listar(estado);
  }

  @Post(':id/en-revision')
  @RequiereAccion('problema.gestionar')
  enRevision(@Param('id') id: string) {
    return this.servicio.marcarEnRevision(id);
  }

  @Post(':id/resolver')
  @RequiereAccion('problema.gestionar')
  resolver(@Param('id') id: string, @Body() dto: ResolverProblemaDto) {
    return this.servicio.resolver(id, dto.nota);
  }
}
