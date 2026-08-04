/**
 * Partición día/noche de un servicio (reunión M3 con Paula).
 * Frontera: día = [07:00, 19:00); noche = [19:00, 07:00) (envuelve medianoche).
 * Un servicio que cruza las 19:00 se cobra en dos bandas (cada una a su tarifa).
 * Solo afecta el COBRO a la familia; el pago a la nannie va por duración total.
 */
export const DIA_INICIO_MIN = 7 * 60; // 07:00
export const NOCHE_INICIO_MIN = 19 * 60; // 19:00
export const TARIFA_NOCHE_MIN = 125; // piso de la banda de noche

function enNoche(minutoDelDia: number): boolean {
  const m = ((minutoDelDia % 1440) + 1440) % 1440;
  return m >= NOCHE_INICIO_MIN || m < DIA_INICIO_MIN;
}

/**
 * Reparte la duración (en horas) desde `horaInicio` (HH:mm) entre día y noche,
 * respetando bloques de 30 min. Maneja el cruce de medianoche.
 */
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
    // Minutos hasta el próximo cambio de banda.
    let hastaCambio: number;
    if (noc) {
      hastaCambio = (minuto >= NOCHE_INICIO_MIN ? 24 * 60 + DIA_INICIO_MIN : DIA_INICIO_MIN) - minuto;
    } else {
      hastaCambio = NOCHE_INICIO_MIN - minuto;
    }
    const paso = Math.min(restante, hastaCambio);
    if (noc) noche += paso;
    else dia += paso;
    inicio += paso;
    restante -= paso;
  }

  return { horasDia: dia / 60, horasNoche: noche / 60 };
}
