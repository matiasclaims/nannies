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

// Colores de estado con la paleta de marca (piel "Claro").
export const ESTADO_SERVICIO: Record<EstadoServicio, { label: string; clase: string }> = {
  OFERTADO: { label: 'Ofertado', clase: 'bg-marca-morado/15 text-marca-morado' },
  ACEPTADO: { label: 'Aceptado', clase: 'bg-marca-azul/15 text-marca-azul' },
  RECHAZADO: { label: 'Rechazado', clase: 'bg-marca-rojo/15 text-marca-rojo' },
  COMPLETADO: { label: 'Completado', clase: 'bg-marca-verde/20 text-[#4d7a16]' },
  CANCELADO: { label: 'Cancelado', clase: 'bg-slate-200 text-slate-500' },
};

export const ESTADO_DISPONIBILIDAD: Record<
  EstadoDisponibilidad,
  { label: string; clase: string }
> = {
  DISPONIBLE: { label: 'Disponible', clase: 'bg-marca-verde/20 text-[#4d7a16]' },
  BLOQUEADO: { label: 'Bloqueado', clase: 'bg-marca-rojo/15 text-marca-rojo' },
  TEMPORAL: { label: 'Bloqueo temporal', clase: 'bg-marca-rosa/15 text-marca-rosa' },
};
