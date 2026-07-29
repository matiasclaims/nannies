import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

/** Bono manual a una nannie (M3): monto + motivo. */
export class CrearBonoDto {
  @IsString()
  nannieId!: string;

  @IsNumber()
  @Min(1)
  monto!: number;

  @IsString()
  @MaxLength(200)
  motivo!: string;
}
