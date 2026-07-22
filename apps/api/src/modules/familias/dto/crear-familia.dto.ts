import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Plaza } from '@prisma/client';

/** Alta rápida de familia (el cardex completo llega en M5). */
export class CrearFamiliaDto {
  @IsString()
  @MaxLength(120)
  nombreContacto!: string;

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
}
