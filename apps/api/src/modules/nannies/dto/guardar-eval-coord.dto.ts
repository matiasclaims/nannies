import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';

/** Evaluación de coordinación POR SERVICIO (Paula 2026-09-03). Mismos 5 pilares
 *  1-10 que la semanal; sin campo `semana` (va ligada al servicio/paquete). */
export class GuardarEvalCoordDto {
  @IsInt() @Min(1) @Max(10) atencionInfantil!: number;
  @IsInt() @Min(1) @Max(10) cumplimientoServicio!: number;
  @IsInt() @Min(1) @Max(10) comunicacion!: number;
  @IsInt() @Min(1) @Max(10) profesionalismo!: number;
  @IsInt() @Min(1) @Max(10) puntualidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string;
}
