import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Plaza } from '@prisma/client';

/** Alta de una nannie (M4): crea su expediente + cuenta (estado Prueba). */
export class CrearNannieDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  /** Usuario de acceso (parte antes de @nannies.mx). Solo minúsculas, números,
   *  punto o guion. El login queda como `usuario@nannies.mx`. */
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{1,40}$/, {
    message: 'El usuario solo admite minúsculas, números, punto o guion (ej. vianney).',
  })
  usuario!: string;

  /** Correo PERSONAL de contacto (opcional; va en la ficha, no es el login). */
  @IsOptional()
  @IsEmail()
  emailPersonal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsEnum(Plaza)
  plaza!: Plaza;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  zonas!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  // El rango arranca en Base y sube solo (cierre de mes); no se elige al alta.
}
