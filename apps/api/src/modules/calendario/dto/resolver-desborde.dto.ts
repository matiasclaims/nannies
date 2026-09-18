import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Resuelve un ADEUDO por definir (servicio de desborde POR_DEFINIR): Paula/Jacky
 * deciden cómo se factura a la familia.
 *  - INDIVIDUAL: se cobra al monto capturado (`cobro`).
 *  - PAQUETE_NUEVO: crea un paquete nuevo del tabulador (`paqueteHoras`) y consume
 *    de él las horas del desborde (cobro prorrateado).
 */
export class ResolverDesbordeDto {
  @IsIn(['INDIVIDUAL', 'PAQUETE_NUEVO'])
  modo!: 'INDIVIDUAL' | 'PAQUETE_NUEVO';

  @IsOptional()
  @IsNumber()
  @Min(1)
  cobro?: number;

  @IsOptional()
  @IsInt()
  @IsIn([10, 20, 30, 40, 50])
  paqueteHoras?: number;
}
