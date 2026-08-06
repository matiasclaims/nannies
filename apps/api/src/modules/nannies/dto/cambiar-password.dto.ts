import { IsString, MaxLength, MinLength } from 'class-validator';

/** Cambio de contraseña propio (M4): el primer ingreso con contraseña temporal. */
export class CambiarPasswordDto {
  @IsString()
  actual!: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(100)
  nueva!: string;
}
