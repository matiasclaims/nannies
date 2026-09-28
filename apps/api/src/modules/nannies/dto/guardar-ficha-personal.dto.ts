import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Datos del expediente que captura la nannie: contacto de emergencia y
 *  consideraciones de salud que la empresa debe conocer. Todos opcionales. */
export class GuardarFichaPersonalDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergenciaNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  emergenciaTelefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  emergenciaParentesco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  consideracionSalud?: string;
}
