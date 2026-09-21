import { IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

/** Comisión de coordinación de un PAQUETE (sobre su cobro total) y su
 *  beneficiario (id de Nannie). null limpia; omitir deja sin cambios. */
export class EditarComisionPaqueteDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  comision?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  comisionBeneficiarioId?: string | null;
}
