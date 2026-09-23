import { IsString, Matches } from 'class-validator';

/**
 * Regenerar/crear el acceso de una nannie (M4): coordinación fija el usuario
 * de login (usuario@nannies.mx) y el sistema genera una contraseña temporal.
 * Sirve tanto para cuentas ya existentes (reset) como para nannies sin cuenta.
 */
export class RegenerarAccesoDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{1,40}$/, {
    message: 'El usuario solo admite minúsculas, números, punto o guion (ej. vianney).',
  })
  usuario!: string;
}
