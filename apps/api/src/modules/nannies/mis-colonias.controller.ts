import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ColoniasService } from './colonias.service';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';

/** M5 · Colonias de trabajo: catálogo + las propias de la nannie (solo lectura;
 *  las colonias las administra coordinación desde el detalle de la nannie). */
@Controller()
export class MisColoniasController {
  constructor(private readonly colonias: ColoniasService) {}

  // Catálogo de colonias (cualquier autenticado; sirve al selector de ambas partes).
  @Get('colonias-toluca')
  catalogo() {
    return this.colonias.catalogo();
  }

  // Colonias propias de la nannie (solo lectura).
  @Get('mis-colonias')
  mias(@UsuarioActual() user: UsuarioAutenticado) {
    if (!user.nannieId) throw new ForbiddenException('Solo las nannies tienen colonias de trabajo.');
    return this.colonias.deNannie(user.nannieId);
  }
}
