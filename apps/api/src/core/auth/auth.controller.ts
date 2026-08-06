import { Body, Controller, Get, Patch, Post, Res, HttpCode, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ActualizarFotoDto } from './dto/actualizar-foto.dto';
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

  /** Devuelve la identidad de la sesión actual (para el frontend). Incluye si
   *  debe cambiar su contraseña temporal (M4), consultado fresco de la BD. */
  @Get('me')
  async me(
    @UsuarioActual() user: UsuarioAutenticado | undefined,
  ): Promise<UsuarioAutenticado & { debeCambiarPassword: boolean; foto: string | null }> {
    if (!user) throw new UnauthorizedException();
    const { debeCambiarPassword, foto } = await this.auth.datosSesion(user);
    return { ...user, debeCambiarPassword, foto };
  }

  /** Foto de perfil propia (cualquier usuario autenticado, sobre lo suyo). */
  @Patch('mi-foto')
  async miFoto(@UsuarioActual() user: UsuarioAutenticado | undefined, @Body() dto: ActualizarFotoDto) {
    if (!user) throw new UnauthorizedException();
    return this.auth.actualizarMiFoto(user, dto.foto ?? null);
  }
}
