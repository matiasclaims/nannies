import { IsIn, IsString, MaxLength } from 'class-validator';
import { CATEGORIAS_DOC } from '../incidentes.service';

export class SubirDocumentoIncidenteDto {
  @IsIn(CATEGORIAS_DOC as unknown as string[])
  categoria!: string;

  @IsString()
  @MaxLength(200)
  nombreArchivo!: string;

  // Archivo en data URL base64 (data:<mime>;base64,<...>).
  @IsString()
  contenido!: string;
}
