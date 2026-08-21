import {
  IsDateString,
  IsEnum,
  IsIn,
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

  // Dirección de ESTE servicio si es distinta al domicilio de la familia (M5).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  // Toluca: colonia del servicio (coordenadas para el match por km).
  @IsOptional()
  @IsString()
  coloniaId?: string;

  @IsEnum(TipoServicio)
  tipoServicio!: TipoServicio;

  @IsEnum(Formato)
  formato!: Formato;

  @IsOptional()
  @IsString()
  paqueteId?: string;

  // M3 · tarifas POR HORA de la familia para INDIVIDUALES. Bandas día/noche
  // (frontera 19:00): un servicio que cruza se cobra tarifaDia×hDía + tarifaNoche×hNoche.
  // Requerido según las bandas que toque el horario; ignorado en PAQUETE (prorrateo)
  // y Ludoteca (usa cobroTotal). La banda de noche tiene piso $125.
  @IsOptional()
  @IsNumber()
  @Min(1)
  tarifaDia?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  tarifaNoche?: number;

  // Querétaro · nivel de servicio por banda (el cobro sale del tabulador por
  // zona). Día: Básico/Intermedio/Premium; noche (desde 19:00): solo Interm/Premium.
  @IsOptional()
  @IsIn(['BASICO', 'INTERMEDIO', 'PREMIUM'])
  nivelDia?: 'BASICO' | 'INTERMEDIO' | 'PREMIUM';

  @IsOptional()
  @IsIn(['BASICO', 'INTERMEDIO', 'PREMIUM'])
  nivelNoche?: 'BASICO' | 'INTERMEDIO' | 'PREMIUM';

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
