import { IsString, MaxLength, MinLength } from 'class-validator';

/** Subida de un documento del expediente (data URL base64). */
export class SubirDocumentoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  clave!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombreArchivo!: string;

  // data:mime;base64,... — tope ~12M chars (≈ 8 MB de archivo).
  @IsString()
  @MaxLength(12_000_000)
  contenido!: string;
}
