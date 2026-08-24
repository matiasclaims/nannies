import { Type } from 'class-transformer';
import { Allow, ArrayMaxSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

/** Una pregunta+respuesta del formulario (el Apps Script las manda EN ORDEN). */
export class ItemFormDto {
  @IsString()
  title!: string;

  // string (texto) o string[] (casillas). Se interpreta en el servicio.
  @Allow()
  answer?: unknown;
}

/** Payload que manda el Apps Script del formulario de familias al enviarse. */
export class SyncFormularioDto {
  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ItemFormDto)
  items!: ItemFormDto[];
}
