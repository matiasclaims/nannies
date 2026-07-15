import { Body, Controller, Get, Post, Res, HttpCode, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Publico } from './decorators/publico.decorator';
import { UsuarioActual } from './decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from './auth.types';

const COOKIE = 'access_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Login. Límite estricto propio contra fuerza bruta (SEGURIDAD §4). */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ rol: string }> {
    const usuario = await this.auth.validar(dto.email, dto.password);
    const token = this.auth.firmarToken(usuario);

    res.cookie(COOKIE, token, {
      httpOnly: true, // no accesible desde JS (SEGURIDAD §4)
      secure: process.env.NODE_ENV === 'production', // HTTPS en prod
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return { rol: usuario.rol };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  }

  /** Devuelve la identidad de la sesión actual (para el frontend). */
  @Get('me')
  me(@UsuarioActual() user: UsuarioAutenticado | undefined): UsuarioAutenticado {
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
