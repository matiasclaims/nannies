import type { NannieExpediente } from './api';

/** Paleta para el color de la nannie (arcoíris + marca). */
export const COLORES_NANNIE = [
  '#FF66C4', '#0CC0DF', '#CB6CE6', '#9DCD5A', '#F97316', '#3B82F6', '#EF476F', '#118AB2',
];

/** Estilo del badge de estado de la nannie. */
export const ESTADO_NANNIE: Record<NannieExpediente['estado'], { label: string; clase: string }> = {
  PRUEBA: { label: 'Prueba', clase: 'bg-amber-100 text-amber-800' },
  ACTIVA: { label: 'Activa', clase: 'bg-marca-verde/25 text-[#5c7a2e]' },
  PAUSA: { label: 'Pausa', clase: 'bg-slate-100 text-slate-600' },
  BAJA: { label: 'Baja', clase: 'bg-[#5B292D]/15 text-[#5B292D]' },
};

export const RANGO_LABEL: Record<string, string> = {
  BASE: 'Base',
  ROOKIE: 'Rookie',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
};

/** Nivel-tarifa del mes (incluye el escalón "25 hrs"). */
export const NIVEL_LABEL: Record<string, string> = {
  BASE: 'Base',
  TARIFA_25HRS: '25 hrs',
  ROOKIE: 'Rookie',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
};

/** Umbrales de ascenso de rango por servicios de por vida (Paula). */
export const UMBRALES_RANGO: { rango: string; servicios: number }[] = [
  { rango: 'ROOKIE', servicios: 50 },
  { rango: 'JUNIOR', servicios: 80 },
  { rango: 'SENIOR', servicios: 130 },
];
