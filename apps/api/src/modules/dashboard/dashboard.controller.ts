import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequiereAccion } from '../../core/auth/decorators/requiere-accion.decorator';
import { UsuarioActual } from '../../core/auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../core/auth/auth.types';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  // Dashboard 360 (M7). Coordinación; el margen solo va si es Directora.
  @RequiereAccion('dashboard.ver')
  @Get()
  panorama(@UsuarioActual() user: UsuarioAutenticado) {
    return this.dashboard.panorama(user);
  }
}
