/**
 * Cálculo del PAGO a la nannie por un servicio, según su nivel-tarifa.
 * Reglas confirmadas con la clienta:
 *  - Generales (Daycare/Nightcare/…): fila del tabulador por duración (3-9 h).
 *  - Fiesta / Play Date: fila "Fiesta N" por duración (3-6 h).
 *  - PAQUETE: prorrateo — pago/hora = (fila "Paquete N" del nivel) ÷ N, por las
 *    horas de la sesión (N = horas totales del paquete). Sumado por semana, cada
 *    nannie cobra sus horas cubiertas × su tarifa.
 *  - Ludoteca: "como fiesta pero por hora" = (Fiesta 3 h del nivel) ÷ 3, por las
 *    horas del servicio + 1 h de montaje/desmontaje (interruptor, ON por defecto).
 * Devuelve monto = null solo si falta un dato (p. ej. tamaño de paquete inválido).
 */
import type { TipoServicio, Formato, NivelTarifa, Plaza } from '@prisma/client';
import { filaPorClave } from './tabulador-pago';
import { pagoQueretaro } from './queretaro-pago';

export interface PagoServicio {
  monto: number | null; // null = no se pudo calcular (dato faltante)
  clave: string | null;
  motivo?: string;
}

export interface OpcionesPago {
  paqueteHoras?: number; // N del paquete (10/20/30/40/50) para servicios PAQUETE
  ludotecaMontaje?: boolean; // ¿pagar la hora de montaje? (default true)
  plaza?: Plaza; // QUERETARO usa su tabulador por zona (sin nivel)
  zona?: string; // zona del servicio (necesaria en Querétaro)
}

const redondea2 = (n: number) => Math.round(n * 100) / 100;

export function pagoDeServicio(
  tipo: TipoServicio,
  duracionHoras: number,
  formato: Formato,
  nivel: NivelTarifa,
  opts: OpcionesPago = {},
): PagoServicio {
  // Querétaro: tabulador propio por zona (sin nivel). El resto es Toluca.
  if (opts.plaza === 'QUERETARO') {
    return pagoQueretaro(tipo, duracionHoras, formato, opts.zona ?? '', opts);
  }

  // PAQUETE: prorrateo del pago del paquete por horas de la sesión.
  if (formato === 'PAQUETE') {
    const n = opts.paqueteHoras;
    const fila = n ? filaPorClave(`PAQ_${n}`) : undefined;
    if (!fila) {
      return { monto: null, clave: null, motivo: 'No se pudo identificar el tamaño del paquete.' };
    }
    const porHora = fila.pago[nivel] / (n as number);
    return { monto: redondea2(porHora * duracionHoras), clave: fila.clave };
  }

  // Ludoteca: tarifa/hora = Fiesta 3 h ÷ 3; + 1 h de montaje si aplica.
  if (tipo === 'LUDOTECA_MOVIL') {
    const fiesta3 = filaPorClave('FIESTA_3');
    if (!fiesta3) return { monto: null, clave: null, motivo: 'Falta la fila Fiesta 3 h.' };
    const porHora = fiesta3.pago[nivel] / 3;
    const horasMontaje = opts.ludotecaMontaje === false ? 0 : 1;
    return { monto: redondea2(porHora * (duracionHoras + horasMontaje)), clave: 'LUDOTECA' };
  }

  // Generales y Fiesta: fila del tabulador por duración.
  const { clave, motivo } = claveTabulador(tipo, duracionHoras);
  if (!clave) return { monto: null, clave: null, motivo };
  const fila = filaPorClave(clave);
  if (!fila) return { monto: null, clave, motivo: 'Fila de tabulador no encontrada' };
  return { monto: fila.pago[nivel], clave };
}

/** Fila del tabulador para servicios generales y de fiesta (no paquete/ludoteca). */
function claveTabulador(tipo: TipoServicio, duracionHoras: number): { clave: string | null; motivo?: string } {
  const d = duracionHoras;
  if (tipo === 'NANNIE_FIESTA_PLAYDATE') {
    if (d >= 3 && d <= 6) return { clave: `FIESTA_${d}` };
    return { clave: null, motivo: `Fiesta de ${d} h fuera del tabulador (3–6 h)` };
  }
  if (d >= 3 && d <= 6) return { clave: `GRAL_${d}` };
  if (d >= 7 && d <= 9) return { clave: 'GRAL_7_9' };
  return { clave: null, motivo: `Duración de ${d} h fuera del tabulador (3–9 h)` };
}
