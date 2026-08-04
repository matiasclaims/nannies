/**
 * Partición día/noche del cobro (espejo del backend). Frontera 19:00:
 * día = [07:00, 19:00); noche = [19:00, 07:00). Solo afecta el cobro a la
 * familia; el pago a la nannie va por duración total. La banda de noche tiene
 * piso $125. Ver apps/api/.../dividir-dia-noche.ts (fuente autoritativa).
 */
export const TARIFA_NOCHE_MIN = 125;
const DIA_INICIO = 7 * 60;
const NOCHE_INICIO = 19 * 60;

const enNoche = (m: number) => {
  const x = ((m % 1440) + 1440) % 1440;
  return x >= NOCHE_INICIO || x < DIA_INICIO;
};

/** Horas completas entre dos HH:mm (maneja cruce de medianoche). null si no da
 *  horas exactas. Espejo del backend `horasEntre`. */
export function horasEntre(inicio: string, fin: string): number | null {
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  let diff = toMin(fin) - toMin(inicio);
  if (diff <= 0) diff += 24 * 60;
  if (diff % 60 !== 0) return null;
  return diff / 60;
}

export function dividirDiaNoche(
  horaInicio: string,
  duracionHoras: number,
): { horasDia: number; horasNoche: number } {
  const [h, m] = horaInicio.split(':').map(Number);
  let inicio = (h || 0) * 60 + (m || 0);
  let restante = Math.round(duracionHoras * 60);
  let dia = 0;
  let noche = 0;
  while (restante > 0) {
    const minuto = ((inicio % 1440) + 1440) % 1440;
    const noc = enNoche(minuto);
    const hastaCambio = noc
      ? (minuto >= NOCHE_INICIO ? 24 * 60 + DIA_INICIO : DIA_INICIO) - minuto
      : NOCHE_INICIO - minuto;
    const paso = Math.min(restante, hastaCambio);
    if (noc) noche += paso;
    else dia += paso;
    inicio += paso;
    restante -= paso;
  }
  return { horasDia: dia / 60, horasNoche: noche / 60 };
}
