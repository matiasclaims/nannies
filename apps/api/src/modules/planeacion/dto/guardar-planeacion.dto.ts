import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

/** Una fila de la planeación: hora, actividad, objetivo y material. Solo la
 *  actividad es obligatoria; las demás son opcionales. */
export class PlaneacionItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  hora?: string;

  @IsString()
  @MaxLength(500)
  actividad!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objetivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  material?: string;
}

/** Body de la planeación de un servicio. Una por servicio (upsert). */
export class GuardarPlaneacionDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PlaneacionItemDto)
  items!: PlaneacionItemDto[];
}
