import type { TipoServicio, EstadoServicio, EstadoDisponibilidad } from '@/lib/api';

/** Ánimo/actitud del niño en el reporte de servicio (M6 · 6.1). Espejo del backend. */
export const ANIMOS = ['Muy bien', 'Bien', 'Regular', 'Difícil'] as const;

export const TIPO_LABEL: Record<TipoServicio, string> = {
  DAYCARE: 'Daycare',
  NIGHTCARE: 'Nightcare',
  ACOMPANAMIENTO_EVENTO: 'Acompañamiento',
  NANNIE_EXPRESS: 'Nannie express',
  NANNIE_FORANEA: 'Nannie foránea',
  NANNIE_FIESTA_PLAYDATE: 'Fiesta / Play Date',
  LUDOTECA_MOVIL: 'Ludoteca móvil',
};

// Colores estilo Google Calendar (para que las nannies migren fácil):
// rojo = asignado · amarillo = disponible · gris = bloqueado · azul = ofertado.
// RECHAZADO = burdeos oscuro (#5B292D): color deliberadamente incómodo para
// que la nannie note el rechazo (petición de Paula).
export const ESTADO_SERVICIO: Record<EstadoServicio, { label: string; clase: string }> = {
  OFERTADO: { label: 'Ofertado', clase: 'bg-marca-azul/15 text-marca-azul' },
  ACEPTADO: { label: 'Asignado', clase: 'bg-marca-rojo/20 text-[#a3312f]' },
  RECHAZADO: { label: 'Rechazado', clase: 'bg-[#5B292D]/20 text-[#5B292D]' },
  COMPLETADO: { label: 'Completado', clase: 'bg-marca-rojo/20 text-[#a3312f]' },
  CANCELADO: { label: 'Cancelado', clase: 'bg-slate-200 text-slate-500' },
};

export const ESTADO_DISPONIBILIDAD: Record<
  EstadoDisponibilidad,
  { label: string; clase: string }
> = {
  DISPONIBLE: { label: 'Disponible', clase: 'bg-amber-100 text-amber-800' },
  BLOQUEADO: { label: 'Bloqueado', clase: 'bg-slate-200 text-slate-600' },
  TEMPORAL: { label: 'Bloqueo temporal', clase: 'bg-slate-200 text-slate-600' },
};

/** Edad de un peque en texto: "3 años", "7 meses", "3 años 5 meses" o
 *  "menor de 1 año" (0 años sin meses). Devuelve null si no hay dato. */
export function edadLabel(edad?: number | null, edadMeses?: number | null): string | null {
  const a = edad ?? 0;
  const m = edadMeses ?? 0;
  const partes: string[] = [];
  if (a > 0) partes.push(`${a} ${a === 1 ? 'año' : 'años'}`);
  if (m > 0) partes.push(`${m} ${m === 1 ? 'mes' : 'meses'}`);
  if (partes.length > 0) return partes.join(' ');
  if (edad === 0) return 'menor de 1 año';
  return null;
}
