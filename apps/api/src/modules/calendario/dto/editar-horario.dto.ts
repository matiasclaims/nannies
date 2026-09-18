import { IsIn, IsInt, IsNumber, IsOptional, Matches, Min } from 'class-validator';

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

  // DESBORDE de paquete al extender: si la extensión pide más horas de las que le
  // quedan al saldo, qué hacer con las sobrantes (mismo criterio que al crear).
  @IsOptional()
  @IsIn(['INDIVIDUAL', 'PAQUETE_NUEVO', 'POR_DEFINIR'])
  desbordeModo?: 'INDIVIDUAL' | 'PAQUETE_NUEVO' | 'POR_DEFINIR';

  @IsOptional()
  @IsNumber()
  @Min(1)
  desbordeCobro?: number;

  @IsOptional()
  @IsInt()
  @IsIn([10, 20, 30, 40, 50])
  desbordePaqueteHoras?: number;
}
