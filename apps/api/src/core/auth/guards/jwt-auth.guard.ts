import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PUBLICO_KEY } from '../decorators/publico.decorator';
import type { UsuarioAutenticado } from '../auth.types';

/**
 * Verifica el JWT que viaja en la cookie httpOnly `access_token`.
 * Se aplica globalmente; las rutas @Publico() lo omiten.
 * (SEGURIDAD §3: cada endpoint verifica al usuario en el backend.)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (esPublico) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies?.['access_token'] as string | undefined;
    if (!token) throw new UnauthorizedException('No autenticado');

    try {
      const payload = await this.jwt.verifyAsync<UsuarioAutenticado>(token);
      req.user = {
        sub: payload.sub,
        nombre: payload.nombre,
        rol: payload.rol,
        nannieId: payload.nannieId ?? null,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }
}
