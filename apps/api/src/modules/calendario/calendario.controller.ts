import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CalendarioService } from './calendario.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { OfertarDto } from './dto/ofertar.dto';
import { ResponderOfertaDto } from './dto/responder-oferta.dto';

@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendario: CalendarioService) {}

  // --- Disponibilidad (1.2) ---

  @Get('disponibilidad')
  listarDisponibilidad(
    @UsuarioActual() user: UsuarioAutenticado,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('nannieId') nannieId?: string,
  ) {
    return this.calendario.listarDisponibilidad(user, { desde, hasta, nannieId });
  }

  // La nannie marca la suya; coordinación puede marcar por otra.
  @RequiereAccion('disponibilidad.propia.editar')
  @Post('disponibilidad')
  crearDisponibilidad(
    @UsuarioActual() user: UsuarioAutenticado,
    @Body() dto: CrearDisponibilidadDto,
  ) {
    return this.calendario.crearDisponibilidad(user, dto);
  }

  // --- Servicios / calendario general (1.1) ---

  @Get('servicios')
  listarServicios(
    @UsuarioActual() user: UsuarioAutenticado,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('nannieId') nannieId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.calendario.listarServicios(user, { desde, hasta, nannieId, estado });
  }

  // Alta de servicio la hace coordinación (motor M2 la escribirá aquí después).
  @RequiereAccion('servicio.asignar')
  @Post('servicios')
  crearServicio(@Body() dto: CrearServicioDto) {
    return this.calendario.crearServicio(dto);
  }

  // --- Ofertas y respuestas (1.3) ---

  // Lista de nannies para el selector de oferta (solo coordinación).
  @RequiereAccion('nannie.gestionar')
  @Get('nannies')
  listarNannies() {
    return this.calendario.listarNannies();
  }

  // Ofertar un servicio a una nannie (coordinación).
  @RequiereAccion('servicio.asignar')
  @Post('ofertas')
  ofertar(@Body() dto: OfertarDto) {
    return this.calendario.ofertarServicio(dto);
  }

  // Responder una oferta: la nannie sobre la suya (pertenencia); coordinación puede registrar.
  @RequiereAccion('oferta.responder')
  @Post('ofertas/:servicioId/responder')
  responder(
    @UsuarioActual() user: UsuarioAutenticado,
    @Param('servicioId') servicioId: string,
    @Body() dto: ResponderOfertaDto,
  ) {
    return this.calendario.responderOferta(user, servicioId, dto);
  }
}
