/**
 * Rúbrica de evaluación de desempeño de nannies (M4, punto G). Definida por
 * Paula (2026-08-07): 5 pilares 1-10 ponderados a 100%. La calificación final
 * es la suma ponderada. La registra coordinación (Paula/Jackie) por semana.
 */
export type ClavePilar =
  | 'atencionInfantil'
  | 'cumplimientoServicio'
  | 'comunicacion'
  | 'profesionalismo'
  | 'puntualidad';

export interface Pilar {
  clave: ClavePilar;
  titulo: string;
  peso: number; // fracción (suman 1)
  evalua: string;
  incluye: string;
}

export const PILARES: Pilar[] = [
  {
    clave: 'atencionInfantil',
    titulo: 'Atención infantil',
    peso: 0.35,
    evalua: 'La calidad del cuidado brindado a los niños.',
    incluye:
      'Seguridad y supervisión, interacción y vínculo con los niños, respuesta a necesidades físicas y emocionales, desarrollo de actividades y juego, manejo de conductas, iniciativa y resolución de situaciones.',
  },
  {
    clave: 'cumplimientoServicio',
    titulo: 'Cumplimiento del servicio',
    peso: 0.25,
    evalua: 'El apego a las expectativas y lineamientos del servicio.',
    incluye:
      'Seguimiento de instrucciones de la familia, cumplimiento de rutinas, apego a protocolos, administración del tiempo, cumplimiento de actividades, orden y cuidado de los espacios y materiales.',
  },
  {
    clave: 'comunicacion',
    titulo: 'Comunicación',
    peso: 0.15,
    evalua: 'La calidad de la comunicación con la familia y la agencia.',
    incluye:
      'Reportes por hora y reporte final, comunicación oportuna con la familia, comunicación con la agencia, reporte de incidencias, claridad, seguimiento y disponibilidad durante el servicio.',
  },
  {
    clave: 'profesionalismo',
    titulo: 'Profesionalismo',
    peso: 0.15,
    evalua: 'La conducta y representación de la marca Nannies.',
    incluye:
      'Actitud de servicio, presentación personal, uso adecuado del celular, respeto, confidencialidad, ética, apego a políticas internas, vínculo con la familia, retroalimentación positiva o áreas de mejora reportadas por los padres.',
  },
  {
    clave: 'puntualidad',
    titulo: 'Puntualidad',
    peso: 0.1,
    evalua: 'El cumplimiento del horario acordado.',
    incluye:
      'Hora de llegada, hora de salida, cumplimiento de la duración del servicio y aviso oportuno en caso de cualquier eventualidad.',
  },
];

/** Incidencia (regla culposa) → pilar afectado, para mostrar la "merma" en la
 *  pantalla de evaluación (la coordinación baja la nota de ese pilar). Las
 *  no culposas no aparecen (no penalizan). */
export const INCIDENCIA_PILAR: Record<number, ClavePilar> = {
  9: 'puntualidad', // llega tarde
  13: 'profesionalismo', // celular
  5: 'profesionalismo', // uniforme
  7: 'profesionalismo', // maltrato / altisonante
  2: 'comunicacion', // no actualiza calendario
  4: 'comunicacion', // no envía reporte final
  6: 'comunicacion', // no reporta cada hora
  8: 'cumplimientoServicio', // no recibe servicio asignado
  10: 'cumplimientoServicio', // no envía justificante
  11: 'cumplimientoServicio', // no cubre 25 h
  12: 'cumplimientoServicio', // elige por pago
};

export function calificacionPonderada(notas: Record<ClavePilar, number>): number {
  const total = PILARES.reduce((s, p) => s + (notas[p.clave] ?? 0) * p.peso, 0);
  return Math.round(total * 100) / 100;
}
