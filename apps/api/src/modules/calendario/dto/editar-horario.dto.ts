import { IsNumber, IsOptional, Matches, Min } from 'class-validator';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Edita el horario (hora fin) de un servicio ya creado — "merodeo": la familia
 *  se queda más tiempo (M3). Recalcula duración, cobro y cascada a finanzas.
 *  `tarifaNoche` opcional: se usa si la nueva duración entra a horario de noche
 *  y el servicio aún no tenía tarifa de noche. */
export class EditarHorarioDto {
  @Matches(HORA, { message: 'horaFin debe ser HH:mm' })
  horaFin!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  tarifaNoche?: number;
}
