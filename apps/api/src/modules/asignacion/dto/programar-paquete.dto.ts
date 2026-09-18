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
 * Programación masiva de un paquete: crea de un jalón una sesión por cada fecha
 * seleccionada, todas con la misma nannie y el mismo horario. Solo se crean las
 * fechas elegidas (mientras quepan en el saldo del paquete).
 */
export class ProgramarPaqueteDto {
  @IsString()
  paqueteId!: string;

  // Fechas específicas (YYYY-MM-DD) en que se crea una sesión del paquete.
  @IsArray()
  @ArrayNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'cada fecha debe ser YYYY-MM-DD' })
  fechas!: string[];

  @Matches(HORA, { message: 'horaInicio debe ser HH:mm' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFin debe ser HH:mm' })
  horaFin!: string;

  @IsEnum(TipoServicio)
  tipoServicio!: TipoServicio;

  @IsInt()
  @Min(1)
  @Max(8)
  numNinos!: number;

  @IsString()
  @MaxLength(120)
  zona!: string;

  // Toluca: colonia del servicio (coordenadas para el match por km). Se toma de
  // la familia; solo cambia si las sesiones son en otra ubicación.
  @IsOptional()
  @IsString()
  coloniaId?: string;

  // Dirección de las sesiones si es distinta al domicilio de la familia (M5). No
  // toca la tarjeta de la familia; queda en cada servicio.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @IsString()
  nannieId?: string;
}
