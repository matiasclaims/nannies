import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { Plaza, TipoServicio, Formato } from '@prisma/client';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Reglas de fuente (Reglamento PF §15-16) validadas aquí:
 *  - duracionHoras: entero (horas completas) y mínimo 3.
 *  - numNinos: rango depende del tipo (se afina en el servicio: 1-3 general,
 *    4-8 para fiesta/ludoteca). Aquí el rango amplio 1-8.
 */
export class CrearServicioDto {
  @IsString()
  familiaId!: string;

  @IsEnum(Plaza)
  plaza!: Plaza;

  @IsString()
  @MaxLength(120)
  zona!: string;

  @IsEnum(TipoServicio)
  tipoServicio!: TipoServicio;

  @IsEnum(Formato)
  formato!: Formato;

  @IsOptional()
  @IsString()
  paqueteId?: string;

  @IsInt()
  @Min(1)
  @Max(8)
  numNinos!: number;

  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  fecha!: string;

  @Matches(HORA, { message: 'horaInicio debe ser HH:mm' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFin debe ser HH:mm' })
  horaFin!: string;

  @IsInt({ message: 'duracionHoras debe ser entero (solo horas completas)' })
  @Min(3, { message: 'El mínimo de horas por servicio es 3' })
  duracionHoras!: number;
}
