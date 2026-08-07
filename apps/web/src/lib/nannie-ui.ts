import type { NannieExpediente } from './api';

/** Paleta amplia (30) para el color de la nannie. El color la identifica en
 *  TODOS los módulos: el nombre se pinta con este color y hace aro en el avatar.
 *  Se eligieron tonos medios/oscuros para que el NOMBRE sea legible sobre blanco. */
export const COLORES_NANNIE = [
  '#E03131', '#C92A2A', '#A61E4D', '#C2255C', '#E64980', '#D6336C',
  '#E8590C', '#D9480F', '#F76707', '#B08900', '#946200', '#66A80F',
  '#2F9E44', '#2B8A3E', '#087F5B', '#099268', '#0C8599', '#1098AD',
  '#0B7285', '#1C7ED6', '#1971C2', '#1864AB', '#364FC7', '#4263EB',
  '#7048E8', '#6741D9', '#9C36B5', '#862E9C', '#AE3EC9', '#495057',
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
