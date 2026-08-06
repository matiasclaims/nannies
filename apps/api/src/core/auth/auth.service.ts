import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioAutenticado } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Verifica credenciales. Mensaje de error genérico e idéntico para
   * "no existe" y "contraseña incorrecta" (no revela qué correos existen).
   */
  async validar(email: string, password: string): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    const credencialesInvalidas = new UnauthorizedException('Credenciales inválidas');

    if (!usuario || !usuario.activo) {
      // Igualar el costo temporal aun cuando el usuario no exista, para no
      // filtrar por tiempo de respuesta qué correos están registrados.
      await argon2.verify(DUMMY_HASH, password).catch(() => false);
      throw credencialesInvalidas;
    }

    const ok = await argon2.verify(usuario.passwordHash, password);
    if (!ok) throw credencialesInvalidas;

    return {
      sub: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
      nannieId: usuario.nannieId,
    };
  }

  /** Firma el JWT que viajará en la cookie httpOnly. */
  firmarToken(usuario: UsuarioAutenticado): string {
    return this.jwt.sign(usuario);
  }

  /** Datos frescos de la sesión (M4): si debe cambiar su contraseña temporal y
   *  su foto de perfil (la de la ficha si es nannie; si no, la del usuario). */
  async datosSesion(
    user: UsuarioAutenticado,
  ): Promise<{ debeCambiarPassword: boolean; foto: string | null }> {
    const u = await this.prisma.usuario.findUnique({
      where: { id: user.sub },
      select: { debeCambiarPassword: true, foto: true },
    });
    const debeCambiarPassword = u?.debeCambiarPassword ?? false;
    if (user.nannieId) {
      const n = await this.prisma.nannie.findUnique({
        where: { id: user.nannieId },
        select: { foto: true },
      });
      return { debeCambiarPassword, foto: n?.foto ?? null };
    }
    return { debeCambiarPassword, foto: u?.foto ?? null };
  }

  /** Actualiza la foto del usuario actual. Nannie → su ficha; coord/directora
   *  → su usuario. `null` la quita. */
  async actualizarMiFoto(
    user: UsuarioAutenticado,
    foto: string | null,
  ): Promise<{ ok: true; foto: string | null }> {
    const valor = foto ?? null;
    if (user.nannieId) {
      await this.prisma.nannie.update({ where: { id: user.nannieId }, data: { foto: valor } });
    } else {
      await this.prisma.usuario.update({ where: { id: user.sub }, data: { foto: valor } });
    }
    return { ok: true, foto: valor };
  }

  static async hashPassword(plano: string): Promise<string> {
    return argon2.hash(plano, { type: argon2.argon2id });
  }
}

// Hash argon2id de una cadena fija; solo para nivelar el tiempo de
// respuesta en el camino "usuario inexistente".
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$Rr0oXQ0m9m2wCkVv0m7oYh0v2b0a4Q9m6n3xkq0m5s8';
