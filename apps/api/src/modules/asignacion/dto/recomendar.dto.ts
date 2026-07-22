import { IsDateString, IsEnum, IsOptional, Matches, MaxLength, IsString } from 'class-validator';
import { Plaza, TipoServicio } from '@prisma/client';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Datos del servicio propuesto para pedir recomendación de nannies. */
export class RecomendarDto {
  @IsEnum(Plaza)
  plaza!: Plaza;

  @IsString()
  @MaxLength(120)
  zona!: string;

  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  fecha!: string;

  @Matches(HORA, { message: 'horaInicio debe ser HH:mm' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFin debe ser HH:mm' })
  horaFin!: string;

  @IsOptional()
  @IsEnum(TipoServicio)
  tipoServicio?: TipoServicio;
}
