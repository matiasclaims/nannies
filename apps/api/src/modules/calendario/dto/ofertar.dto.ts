import { IsString } from 'class-validator';

/** Oferta de un servicio a una nannie (coordinación). */
export class OfertarDto {
  @IsString()
  servicioId!: string;

  @IsString()
  nannieId!: string;
}
