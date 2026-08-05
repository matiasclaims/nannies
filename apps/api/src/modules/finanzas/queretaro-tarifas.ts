/**
 * Tabuladores de QUERÉTARO (fuente: PEqro 2026 + tablas de cobro de Paula, ago-2026).
 * Querétaro NO usa el tabulador de Toluca: todo va por ZONA geográfica, SIN
 * niveles de nannie (no hay programa de crecimiento) y SIN Ludoteca.
 *
 * - COBRO a la familia: por zona. Individuales por hora en 3 niveles
 *   (Básico/Intermedio/Premium); de día (7am–7pm) están los 3, de noche
 *   (7pm–1am) solo Intermedio/Premium (Básico no disponible). Fiesta por hora.
 *   Paquetes 10/20/30 con precio total por zona.
 * - PAGO a la nannie: por zona, plano por hora (individual y fiesta) y total por
 *   paquete. NO se parte día/noche (va por duración total).
 *
 * La partición día/noche del cobro individual reutiliza dividir-dia-noche.ts
 * (frontera 19:00); el "piso" de noche aquí es el nivel INTERMEDIO.
 */

export const ZONAS_QRO = ['Estrella', 'Horizonte', 'Corazón', 'Conecta', 'Raíces', 'Impulso'] as const;
export type ZonaQro = (typeof ZONAS_QRO)[number];

export type NivelServicioQro = 'BASICO' | 'INTERMEDIO' | 'PREMIUM';

interface TarifasZona {
  cobroIndividualHora: Record<NivelServicioQro, number>;
  cobroFiestaHora: number;
  cobroPaquete: Record<10 | 20 | 30, number>;
  pagoIndividualHora: number;
  pagoFiestaHora: number;
  pagoPaquete: Record<10 | 20 | 30, number>;
}

export const TARIFAS_QRO: Record<ZonaQro, TarifasZona> = {
  Estrella: {
    cobroIndividualHora: { BASICO: 165, INTERMEDIO: 190, PREMIUM: 215 },
    cobroFiestaHora: 310,
    cobroPaquete: { 10: 1650, 20: 3100, 30: 4200 },
    pagoIndividualHora: 110,
    pagoFiestaHora: 200,
    pagoPaquete: { 10: 1100, 20: 2200, 30: 3300 },
  },
  Horizonte: {
    cobroIndividualHora: { BASICO: 155, INTERMEDIO: 180, PREMIUM: 205 },
    cobroFiestaHora: 290,
    cobroPaquete: { 10: 1700, 20: 2900, 30: 3850 },
    pagoIndividualHora: 100,
    pagoFiestaHora: 550 / 3,
    pagoPaquete: { 10: 1000, 20: 2000, 30: 3000 },
  },
  Corazón: {
    cobroIndividualHora: { BASICO: 160, INTERMEDIO: 185, PREMIUM: 210 },
    cobroFiestaHora: 280,
    cobroPaquete: { 10: 1600, 20: 2650, 30: 3650 },
    pagoIndividualHora: 310 / 3,
    pagoFiestaHora: 170,
    pagoPaquete: { 10: 1030, 20: 2060, 30: 3090 },
  },
  Conecta: {
    cobroIndividualHora: { BASICO: 155, INTERMEDIO: 180, PREMIUM: 205 },
    cobroFiestaHora: 275,
    cobroPaquete: { 10: 1700, 20: 2900, 30: 3850 },
    pagoIndividualHora: 100,
    pagoFiestaHora: 550 / 3,
    pagoPaquete: { 10: 1000, 20: 2000, 30: 3000 },
  },
  Raíces: {
    cobroIndividualHora: { BASICO: 145, INTERMEDIO: 170, PREMIUM: 195 },
    cobroFiestaHora: 250,
    cobroPaquete: { 10: 1500, 20: 2500, 30: 3400 },
    pagoIndividualHora: 275 / 3,
    pagoFiestaHora: 160,
    pagoPaquete: { 10: 916, 20: 1832, 30: 2748 },
  },
  Impulso: {
    cobroIndividualHora: { BASICO: 145, INTERMEDIO: 170, PREMIUM: 195 },
    cobroFiestaHora: 250,
    cobroPaquete: { 10: 1600, 20: 2650, 30: 3650 },
    pagoIndividualHora: 275 / 3,
    pagoFiestaHora: 160,
    pagoPaquete: { 10: 916, 20: 1832, 30: 2748 },
  },
};

/** Nivel mínimo disponible según la hora: de noche (desde 19:00) no hay Básico. */
export const PISO_NOCHE_QRO: NivelServicioQro = 'INTERMEDIO';

/** Niveles de servicio que se pueden elegir según sea banda de día o de noche. */
export function nivelesDisponiblesQro(esNoche: boolean): NivelServicioQro[] {
  return esNoche ? ['INTERMEDIO', 'PREMIUM'] : ['BASICO', 'INTERMEDIO', 'PREMIUM'];
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Resuelve la zona (tolerante a acentos/mayúsculas) o null si no es de Qro. */
export function zonaQroDe(zona: string | null | undefined): ZonaQro | null {
  if (!zona) return null;
  const n = norm(zona);
  return ZONAS_QRO.find((z) => norm(z) === n) ?? null;
}

/** Tabla de tarifas de una zona de Qro (o null si la zona no es de Qro). */
export function tarifasZonaQro(zona: string): TarifasZona | null {
  const z = zonaQroDe(zona);
  return z ? TARIFAS_QRO[z] : null;
}
