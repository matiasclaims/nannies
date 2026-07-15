import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ACCION_KEY } from '../decorators/requiere-accion.decorator';
import { puedeEjecutar, type Accion } from '../../rbac/permissions';

/**
 * Autoriza según la MATRIZ DE PERMISOS central: lee la acción exigida por
 * el endpoint (@RequiereAccion) y comprueba ACTION_POLICY para el rol.
 * (SEGURIDAD §3: verificación de rol en cada ruta, desde un solo lugar.)
 */
@Injectable()
export class AccionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const accion = this.reflector.getAllAndOverride<Accion | undefined>(ACCION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    // Sin @RequiereAccion: basta estar autenticado (lo garantiza JwtAuthGuard).
    if (!accion) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Sin usuario autenticado');

    if (!puedeEjecutar(user.rol, accion)) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}
