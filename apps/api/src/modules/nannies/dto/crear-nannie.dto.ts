import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Plaza } from '@prisma/client';

/** Alta de una nannie (M4): crea su expediente + cuenta (estado Prueba). */
export class CrearNannieDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsEmail()
  correo!: string;

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
