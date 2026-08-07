import type { NannieExpediente } from './api';

/** Paleta amplia (~30) para el color de la nannie. El color la identifica en
 *  todos los perfiles (anillo del avatar / nombre en texto). */
export const COLORES_NANNIE = [
  '#EF476F', '#F94144', '#E5383B', '#D00000', '#DC2F02', '#F97316', '#FB8500', '#FFB703',
  '#F4A261', '#E9C46A', '#9DCD5A', '#80B918', '#55A630', '#2D6A4F', '#06D6A0', '#0CC0DF',
  '#00B4D8', '#118AB2', '#0077B6', '#3B82F6', '#4361EE', '#3A0CA3', '#7209B7', '#9D4EDD',
  '#CB6CE6', '#C77DFF', '#FF66C4', '#FF5D8F', '#8D99AE', '#6D6875',
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
