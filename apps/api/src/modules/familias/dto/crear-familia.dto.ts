import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Plaza } from '@prisma/client';

/** Alta de familia desde el sistema (M5). Datos esenciales; el resto del cardex
 *  se completa en el expediente. Solo nombre y plaza son obligatorios. */
export class CrearFamiliaDto {
  @IsString()
  @MaxLength(120)
  nombreContacto!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellido?: string;

  @IsEnum(Plaza)
  plaza!: Plaza;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  zona?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numeroEmergencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;
}
