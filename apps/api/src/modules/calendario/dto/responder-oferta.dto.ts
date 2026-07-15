import { IsEnum } from 'class-validator';
import { RespuestaOferta } from '@prisma/client';

/** Respuesta de la nannie a una oferta: aceptó / rechazó. */
export class ResponderOfertaDto {
  @IsEnum(RespuestaOferta)
  respuesta!: RespuestaOferta;
}
