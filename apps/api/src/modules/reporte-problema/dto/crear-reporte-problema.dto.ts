import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TipoReporteProblema } from '@prisma/client';

/** Un usuario reporta un problema/sugerencia del sistema. */
export class CrearReporteProblemaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  descripcion!: string;

  @IsOptional()
  @IsEnum(TipoReporteProblema)
  tipo?: TipoReporteProblema;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}
