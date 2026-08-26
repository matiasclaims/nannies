import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Ánimo/actitud del niño durante el servicio (valores cerrados). */
export const ANIMOS = ['Muy bien', 'Bien', 'Regular', 'Difícil'] as const;

/** Body del reporte de servicio (M6 · 6.1). Uno por servicio. */
export class GuardarReporteDto {
  @IsString()
  @MinLength(3, { message: 'Describe brevemente las actividades.' })
  @MaxLength(2000)
  actividades!: string;

  @IsIn(ANIMOS, { message: 'Ánimo inválido.' })
  animoNino!: (typeof ANIMOS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  incidentes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}
