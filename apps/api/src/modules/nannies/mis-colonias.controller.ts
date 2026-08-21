import { Body, Controller, ForbiddenException, Get, Put } from '@nestjs/common';
import { ColoniasService } from './colonias.service';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';
import { GuardarColoniasDto } from './dto/guardar-colonias.dto';

/** M5 · Colonias de trabajo: catálogo + las propias de la nannie (autoservicio). */
@Controller()
export class MisColoniasController {
  constructor(private readonly colonias: ColoniasService) {}

  // Catálogo de colonias (cualquier autenticado; sirve al selector de ambas partes).
  @Get('colonias-toluca')
  catalogo() {
    return this.colonias.catalogo();
  }

  // Colonias propias de la nannie.
  @Get('mis-colonias')
  mias(@UsuarioActual() user: UsuarioAutenticado) {
    if (!user.nannieId) throw new ForbiddenException('Solo las nannies tienen colonias de trabajo.');
    return this.colonias.deNannie(user.nannieId);
  }

  // Guardar las propias (solo si no están bloqueadas; `confirmar` las bloquea).
  @Put('mis-colonias')
  guardar(@UsuarioActual() user: UsuarioAutenticado, @Body() dto: GuardarColoniasDto) {
    if (!user.nannieId) throw new ForbiddenException('Solo las nannies tienen colonias de trabajo.');
    return this.colonias.guardarPropias(user.nannieId, dto);
  }
}
