import { IsInt } from 'class-validator';

/** Alta mínima de paquete (M2): solo el tramo de horas. El precio se toma
 *  del tabulador; el cobro/pago se maneja en M3. */
export class CrearPaqueteDto {
  @IsInt()
  horas!: number;
}
