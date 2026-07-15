import { SetMetadata } from '@nestjs/common';

export const PUBLICO_KEY = 'ruta_publica';

/**
 * Marca una ruta como pública (sin autenticación). Uso muy acotado:
 * login y el endpoint aislado de encuesta (M6). Todo lo demás exige sesión.
 */
export const Publico = () => SetMetadata(PUBLICO_KEY, true);
