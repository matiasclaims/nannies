import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { EstadoDisponibilidad } from '@prisma/client';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CrearDisponibilidadDto {
  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  fecha!: string;

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
