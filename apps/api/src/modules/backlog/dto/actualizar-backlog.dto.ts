import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PRIORIDADES } from './crear-backlog.dto';

export const ESTADOS_BACKLOG = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'] as const;

export class ActualizarBacklogDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El título es muy corto.' })
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  descripcion?: string;

  @IsOptional()
  @IsIn(PRIORIDADES, { message: 'Prioridad inválida.' })
  prioridad?: (typeof PRIORIDADES)[number];

  @IsOptional()
  @IsIn(ESTADOS_BACKLOG, { message: 'Estado inválido.' })
  estado?: (typeof ESTADOS_BACKLOG)[number];
}
