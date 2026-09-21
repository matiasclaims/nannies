import { IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

/** Edición manual de la finanza de un servicio (3.3): comisión y ajuste.
 *  Pasar null limpia el campo; omitir el campo lo deja sin cambios. */
export class EditarFinanzaDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  comision?: number | null;

  /** Beneficiario de la comisión (id de Nannie). null la deja sin beneficiario. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  comisionBeneficiarioId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  ajuste?: number | null;
}
