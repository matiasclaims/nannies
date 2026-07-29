/** Opciones de hora en bloques de 30 minutos (00:00 … 23:30). Regla del sistema:
 *  todos los campos de hora van de 30 en 30 min, nunca minuto por minuto. */
export const OPCIONES_HORA: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});
