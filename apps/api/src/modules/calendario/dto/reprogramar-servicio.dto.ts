import { IsOptional, IsString, Matches } from 'class-validator';

/** Reprogramar un servicio a otra fecha (coordinación). Política 16: individual
 *  pagado solo dentro de 7 días; ≥24h a criterio de coordinación. */
export class ReprogramarServicioDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'nuevaFecha debe ser YYYY-MM-DD' })
  nuevaFecha!: string;

  // Opcional: cambiar también la hora de inicio (conserva la misma duración).
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaInicio debe ser HH:mm' })
  horaInicio?: string;
}
