import { IsBoolean } from 'class-validator';

/** Activar/desactivar si un servicio requiere planeación. Coordinación. */
export class MarcarPlaneacionDto {
  @IsBoolean()
  requiere!: boolean;
}
