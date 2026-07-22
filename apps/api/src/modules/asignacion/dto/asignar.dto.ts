import { IsString } from 'class-validator';
import { CrearServicioDto } from '../../calendario/dto/crear-servicio.dto';

/**
 * Confirmar la asignación: crea el servicio (hereda las validaciones de
 * CrearServicioDto: mín. 3 hrs, nº de niños, etc.) y lo oferta a la nannie
 * elegida (puede ser del ranking o un override).
 */
export class AsignarDto extends CrearServicioDto {
  @IsString()
  nannieId!: string;
}
