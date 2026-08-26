import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Respuesta del papá a la encuesta de evaluación (M6 · 6.2). Corta. */
export class ResponderEncuestaDto {
  @IsInt()
  @Min(1, { message: 'La calificación va del 1 al 10.' })
  @Max(10, { message: 'La calificación va del 1 al 10.' })
  calificacion!: number;

  @IsBoolean()
  volveriaContratar!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}
