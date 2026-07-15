import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../auth.types';

/** Inyecta el usuario autenticado (req.user) en el handler. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user;
  },
);
