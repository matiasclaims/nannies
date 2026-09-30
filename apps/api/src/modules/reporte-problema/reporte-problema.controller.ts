import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ReporteProblemaService } from './reporte-problema.service';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearReporteProblemaDto } from './dto/crear-reporte-problema.dto';

/** Cualquier usuario autenticado puede reportar un problema del sistema. */
@Controller('reportes-problema')
export class ReporteProblemaController {
  constructor(private readonly servicio: ReporteProblemaService) {}

  @Post()
  crear(@UsuarioActual() user: UsuarioAutenticado | undefined, @Body() dto: CrearReporteProblemaDto) {
    if (!user) throw new UnauthorizedException();
    return this.servicio.crear(user, dto);
  }
}
