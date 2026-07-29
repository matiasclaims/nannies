import { IsEnum, IsOptional, Matches } from 'class-validator';
import { EstadoDisponibilidad } from '@prisma/client';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Edición de un bloque de disponibilidad propio (corregir captura). */
export class EditarDisponibilidadDto {
  @IsOptional()
  @Matches(HORA, { message: 'horaInicio debe ser HH:mm' })
  horaInicio?: string;

  @IsOptional()
  @Matches(HORA, { message: 'horaFin debe ser HH:mm' })
  horaFin?: string;

  @IsOptional()
  @IsEnum(EstadoDisponibilidad)
  estado?: EstadoDisponibilidad;
}
