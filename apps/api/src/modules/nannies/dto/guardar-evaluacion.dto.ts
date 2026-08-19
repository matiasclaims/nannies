import { IsInt, IsOptional, IsString, Matches, MaxLength, Max, Min } from 'class-validator';

/** Evaluación semanal de una nannie (M4 punto G). Cada pilar 1-10. */
export class GuardarEvaluacionDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Semana inválida (YYYY-MM-DD).' })
  semana!: string;

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
