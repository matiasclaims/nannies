import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { EstadoDisponibilidad } from '@prisma/client';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Marcar disponibilidad en VARIAS fechas de un jalón (mismo horario/estado).
 *  El frontend arma las fechas a partir de los días elegidos y las semanas. */
export class CrearDisponibilidadMultipleDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(400)
  @IsDateString({}, { each: true, message: 'cada fecha debe ser YYYY-MM-DD' })
  fechas!: string[];

  @Matches(HORA, { message: 'horaInicio debe ser HH:mm' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFin debe ser HH:mm' })
  horaFin!: string;

  @IsOptional()
  @IsEnum(EstadoDisponibilidad)
  estado?: EstadoDisponibilidad;

  @IsOptional()
  @IsDateString({}, { message: 'fechaReintegro debe ser YYYY-MM-DD' })
  fechaReintegro?: string;
}
