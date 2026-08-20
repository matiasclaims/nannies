/** Áreas de desarrollo a trabajar con el peque (form de alta §1, casillas). */
export const AREAS_TRABAJO = [
  'Atención',
  'Concentración',
  'Memoria',
  'Tolerancia a la frustración',
  'Motricidad',
  'Socialización',
  'Creatividad',
] as const;

export type AreaTrabajo = (typeof AREAS_TRABAJO)[number];
