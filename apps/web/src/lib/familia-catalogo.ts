/** Áreas de desarrollo a trabajar (espejo de la API). Casillas del form §1. */
export const AREAS_TRABAJO = [
  'Atención',
  'Concentración',
  'Memoria',
  'Tolerancia a la frustración',
  'Motricidad',
  'Socialización',
  'Creatividad',
] as const;

/** Los 4 consentimientos del form (§1). */
export const CONSENTIMIENTOS = [
  { clave: 'consentimientoReglamento', label: 'Reglamento' },
  { clave: 'consentimientoMedico', label: 'Cobertura médica' },
  { clave: 'consentimientoPrivacidad', label: 'Aviso de privacidad' },
  { clave: 'consentimientoConfidencialidad', label: 'Confidencialidad de nannies' },
] as const;
