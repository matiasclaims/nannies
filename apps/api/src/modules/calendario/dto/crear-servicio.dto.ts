import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
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

  // M3 · tarifa POR HORA de la familia para servicios INDIVIDUALES (menú
  // $95–$160 o monto libre). El cobro total = tarifa × horas. Requerido cuando
  // formato = INDIVIDUAL; ignorado en PAQUETE (se prorratea el precio del paquete).
  @IsOptional()
  @IsNumber()
  @Min(1)
  cobroIndividual?: number;

  // M3 · cobro TOTAL ya calculado (Ludoteca: suma de estaciones). Si viene, se
  // usa tal cual como cobro de la familia (no se multiplica por horas).
  @IsOptional()
  @IsNumber()
  @Min(1)
  cobroTotal?: number;

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
