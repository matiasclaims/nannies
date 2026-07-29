import { IsString, MaxLength, MinLength } from 'class-validator';

/** Nota de bitácora de una familia (M5 §5.3). */
export class CrearNotaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  texto!: string;
}
