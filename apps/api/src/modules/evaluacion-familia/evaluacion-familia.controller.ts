import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EvaluacionFamiliaService } from './evaluacion-familia.service';
import { Publico } from '../../core/auth/decorators/publico.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { ResponderEncuestaDto } from './dto/responder-encuesta.dto';

@Controller('evaluaciones')
export class EvaluacionFamiliaController {
  constructor(private readonly evaluaciones: EvaluacionFamiliaService) {}

  // Link de la encuesta de un servicio (para compartir con el papá). La nannie
  // (su servicio) o coordinación. La pertenencia se valida en el servicio.
  @Get('servicio/:servicioId/link')
  link(@Param('servicioId') servicioId: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.evaluaciones.linkDeServicio(servicioId, user);
  }

  // Contexto público de la encuesta (la abre el papá sin login).
  @Publico()
  @Get('encuesta/:token')
  encuesta(@Param('token') token: string) {
    return this.evaluaciones.encuestaPublica(token);
  }

  // El papá responde (público, protegido por el token; una sola vez).
  @Publico()
  @Post('encuesta/:token')
  responder(@Param('token') token: string, @Body() dto: ResponderEncuestaDto) {
    return this.evaluaciones.responder(token, dto);
  }

  // Resumen propio de la nannie: solo su promedio global (sin respuestas/familias).
  @Get('mi-resumen')
  miResumen(@UsuarioActual() user: UsuarioAutenticado) {
    return this.evaluaciones.miResumen(user);
  }

  // Resumen para coordinación: promedio + aviso <7.5 + respuestas individuales.
  @Get('nannie/:nannieId/resumen')
  resumenNannie(@Param('nannieId') nannieId: string, @UsuarioActual() user: UsuarioAutenticado) {
    return this.evaluaciones.resumenNannie(nannieId, user);
  }
}
