import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Foto de perfil (avatar). La imagen ya viene redimensionada desde el
 * navegador (~400px) como data URL. `null`/ausente = quitar la foto.
 * El tope de longitud acota el tamaño guardado en la BD.
 */
export class ActualizarFotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(350_000, { message: 'La foto es demasiado grande.' })
  @Matches(/^data:image\/(png|jpeg|jpg|webp);base64,/, {
    message: 'Formato de imagen no válido.',
  })
  foto?: string | null;
}
