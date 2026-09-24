import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoReferencia } from '@prisma/client';

/** Una referencia (laboral o personal) capturada por la nannie. */
class ReferenciaItemDto {
  @IsEnum(TipoReferencia)
  tipo!: TipoReferencia;

  @IsInt()
  @Min(1)
  @Max(2)
  orden!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  aniosConocer?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  empresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  puesto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parentesco?: string;
}

/** Alta/edición de las referencias de la nannie (hasta 2 laborales + 2 personales). */
export class GuardarReferenciasDto {
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ReferenciaItemDto)
  referencias!: ReferenciaItemDto[];
}
