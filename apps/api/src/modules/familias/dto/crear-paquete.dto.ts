import { IsBoolean, IsInt, IsOptional } from 'class-validator';

/** Alta mínima de paquete (M2): tramo de horas + si es de asignación manual
 *  (la familia no dio fechas). El precio se toma del tabulador; el cobro/pago
 *  se maneja en M3. */
export class CrearPaqueteDto {
  @IsInt()
  horas!: number;

  @IsOptional()
  @IsBoolean()
  asignacionManual?: boolean;
}
