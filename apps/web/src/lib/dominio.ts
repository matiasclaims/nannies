import type { TipoServicio, EstadoServicio, EstadoDisponibilidad } from '@/lib/api';

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
