/**
 * Espejo (solo COBRO) de los tabuladores de Querétaro para la UI de asignación.
 * Fuente autoritativa: apps/api/.../queretaro-tarifas.ts. Aquí solo lo que la
 * pantalla necesita para mostrar tarifas y calcular el preview del cobro.
 * Querétaro NO tiene Ludoteca y NO usa niveles de nannie.
 */
export const ZONAS_QRO = ['Estrella', 'Horizonte', 'Corazón', 'Conecta', 'Raíces', 'Impulso'] as const;
export type ZonaQro = (typeof ZONAS_QRO)[number];

export type NivelServicioQro = 'BASICO' | 'INTERMEDIO' | 'PREMIUM';

export const NIVEL_QRO_LABEL: Record<NivelServicioQro, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  PREMIUM: 'Premium',
};

interface CobroZonaQro {
  individualHora: Record<NivelServicioQro, number>;
  fiestaHora: number;
}

export const COBRO_QRO: Record<ZonaQro, CobroZonaQro> = {
  Estrella: { individualHora: { BASICO: 165, INTERMEDIO: 190, PREMIUM: 215 }, fiestaHora: 310 },
  Horizonte: { individualHora: { BASICO: 155, INTERMEDIO: 180, PREMIUM: 205 }, fiestaHora: 290 },
  Corazón: { individualHora: { BASICO: 160, INTERMEDIO: 185, PREMIUM: 210 }, fiestaHora: 280 },
  Conecta: { individualHora: { BASICO: 155, INTERMEDIO: 180, PREMIUM: 205 }, fiestaHora: 275 },
  Raíces: { individualHora: { BASICO: 145, INTERMEDIO: 170, PREMIUM: 195 }, fiestaHora: 250 },
  Impulso: { individualHora: { BASICO: 145, INTERMEDIO: 170, PREMIUM: 195 }, fiestaHora: 250 },
};

/** Niveles disponibles según la banda: de noche (desde 19:00) no hay Básico. */
export function nivelesQro(esNoche: boolean): NivelServicioQro[] {
  return esNoche ? ['INTERMEDIO', 'PREMIUM'] : ['BASICO', 'INTERMEDIO', 'PREMIUM'];
}

export function esZonaQro(zona: string): zona is ZonaQro {
  return (ZONAS_QRO as readonly string[]).includes(zona);
}
