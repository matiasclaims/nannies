import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Aplica una penalización por sus ocurrencias. Cambios de estado (Baja/Prueba)
 * no requieren más. Los descuentos al pago requieren `servicioId` (a qué servicio
 * de la nannie) y `monto` (ya calculado por el front, editable por la Directora).
 */
export class AplicarIncidenciaDto {
  @IsString()
  nannieId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ocurrenciasIds!: string[];

  @IsOptional()
  @IsString()
  servicioId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  monto?: number;
}
