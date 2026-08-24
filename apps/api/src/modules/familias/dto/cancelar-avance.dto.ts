import { IsString } from 'class-validator';

/** Body para que la familia cancele una fecha desde el enlace público. */
export class CancelarAvanceDto {
  @IsString()
  servicioId!: string;
}
