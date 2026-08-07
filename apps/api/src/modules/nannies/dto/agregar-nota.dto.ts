import { IsString, MaxLength, MinLength } from 'class-validator';

/** Nota de bitácora de coordinación sobre una nannie (M4). */
export class AgregarNotaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  texto!: string;
}
