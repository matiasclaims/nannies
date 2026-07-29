import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { TipoServicio } from '@prisma/client';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Programación masiva de un paquete: genera todas las sesiones de un patrón
 * semanal (días + horario) desde una fecha, hasta agotar las horas del paquete.
 */
export class ProgramarPaqueteDto {
  @IsString()
  paqueteId!: string;

  // Días de la semana (0=domingo … 6=sábado) en que se repite la sesión.
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana!: number[];

  @Matches(HORA, { message: 'horaInicio debe ser HH:mm' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFin debe ser HH:mm' })
  horaFin!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaInicio debe ser YYYY-MM-DD' })
  fechaInicio!: string;

  @IsEnum(TipoServicio)
  tipoServicio!: TipoServicio;

  @IsInt()
  @Min(1)
  @Max(8)
  numNinos!: number;

  @IsString()
  @MaxLength(120)
  zona!: string;

  @IsOptional()
  @IsString()
  nannieId?: string;
}
