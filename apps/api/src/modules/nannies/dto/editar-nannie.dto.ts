import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoNannie } from '@prisma/client';

/** Edición del expediente de una nannie (M4). Todo opcional. */
export class EditarNannieDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zonas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsEnum(EstadoNannie)
  estado?: EstadoNannie;

  // El rango NO se edita a mano: asciende automático en el cierre de mes.
  // La documentación/capacitación "completa" se DERIVA de estos arreglos.

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentosEntregados?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cursosCompletados?: string[];
}
