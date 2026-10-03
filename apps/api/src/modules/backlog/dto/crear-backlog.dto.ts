import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA'] as const;

export class CrearBacklogDto {
  @IsString()
  @MinLength(2, { message: 'El título es muy corto.' })
  @MaxLength(200)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  descripcion?: string;

  @IsOptional()
  @IsIn(PRIORIDADES, { message: 'Prioridad inválida.' })
  prioridad?: (typeof PRIORIDADES)[number];

  /** Reporte de problema del que nace el ítem (botón "Pasar a backlog"). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  origenReporteId?: string;
}
