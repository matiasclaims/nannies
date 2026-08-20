import { IsString } from 'class-validator';

/** Reasignar un servicio a otra nannie (coordinación). */
export class ReasignarServicioDto {
  @IsString()
  nannieId!: string;
}
