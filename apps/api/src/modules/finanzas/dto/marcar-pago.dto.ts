import { IsBoolean, IsDateString, IsString } from 'class-validator';

/** Marca/desmarca como pagada la nómina de una nannie en una semana (M3).
 *  `semana` = el domingo de inicio (YYYY-MM-DD). */
export class MarcarPagoDto {
  @IsString()
  nannieId!: string;

  @IsDateString()
  semana!: string;

  @IsBoolean()
  pagado!: boolean;
}
