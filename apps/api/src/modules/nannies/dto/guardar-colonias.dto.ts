import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Una colonia de trabajo con los días en que aplica (0=dom … 6=sáb). */
export class ColoniaDiasDto {
  @IsString()
  coloniaId!: string;

  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  dias!: number[];
}

/** Guardar las colonias de trabajo de una nannie (reemplaza el conjunto). */
export class GuardarColoniasDto {
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => ColoniaDiasDto)
  colonias!: ColoniaDiasDto[];

  // La nannie: al confirmar, deja sus colonias bloqueadas (candado).
  @IsOptional()
  @IsBoolean()
  confirmar?: boolean;

  // Coordinación: puede fijar/levantar el candado explícitamente.
  @IsOptional()
  @IsBoolean()
  bloqueadas?: boolean;
}
