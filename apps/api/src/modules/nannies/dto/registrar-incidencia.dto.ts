import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** Registro de una incidencia contra una nannie (M4). */
export class RegistrarIncidenciaDto {
  @IsString()
  nannieId!: string;

  @IsInt()
  regla!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nota?: string;
}
