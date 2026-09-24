import { IsString, MaxLength, MinLength } from 'class-validator';

/** Solicitud de restablecimiento: el usuario escribe su correo/usuario de login. */
export class OlvidePasswordDto {
  @IsString()
  @MaxLength(160)
  correo!: string;
}

/** Restablecimiento con token: token del enlace + la nueva contraseña. */
export class RestablecerDto {
  @IsString()
  @MaxLength(200)
  token!: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(100)
  nueva!: string;
}
