import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Cancelar un servicio (la familia canceló). Coordinación. */
export class CancelarServicioDto {
  // Regla de 24h como sugerencia; coordinación decide si se cobra la hora.
  @IsBoolean()
  cobrar!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
