/**
 * Catálogo de incidencias registrables (M4). Modelo de strikes UNIFICADO
 * (Paula, 2026-08-06): cada incidencia de descuento suma 1 STRIKE; al 3er strike
 * → −20% del próximo servicio. Las de Baja/Prueba y "descontar horas" son
 * DIRECTAS (no cuentan strike). Las #1 (sin docs) y #3 (sin capacitación) NO
 * están aquí: viven en la alerta de Nómina (checklist). En la UI NO se muestran
 * los números de regla (para que el listado no se vea inconsistente).
 */
export type TipoConsecuencia =
  | 'DESCUENTO_PROX_SERVICIO'
  | 'DESCONTAR_HORAS'
  | 'BAJA'
  | 'PRUEBA';

export interface ReglaIncidencia {
  numero: number;
  situacion: string;
  esStrike: boolean; // true = suma 1 strike (al 3º → −20%); false = directa
  tipo?: TipoConsecuencia; // solo reglas directas (BAJA/PRUEBA/DESCONTAR_HORAS)
  consecuenciaTexto: string;
  notaObligatoria?: boolean; // la regla "Otro" exige describir qué pasó
  noCulposa?: boolean; // justificada: SOLO se registra, no penaliza ni suma strike
}

const STRIKE_TXT = 'Suma 1 strike (al 3º: −20% del próximo servicio)';
const NO_CULPOSA_TXT = 'Solo queda registrada (no penaliza)';

export const REGLAS_INCIDENCIA: ReglaIncidencia[] = [
  { numero: 2, situacion: 'No cumple una solicitud de actualizar su calendario', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 4, situacion: 'No atiende una solicitud de envío de reporte final', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 5, situacion: 'No usa el uniforme en un servicio', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 6, situacion: 'No atiende una solicitud de reportar cada hora', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 8, situacion: 'Se le asigna un servicio en su zona/horario disponible y no lo recibe', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 9, situacion: 'Llega tarde (más de 5 min; debe reponer el tiempo)', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 12, situacion: 'Elige servicios por el pago y no por disponibilidad', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 13, situacion: 'Un papá reporta uso excesivo del celular', esStrike: true, consecuenciaTexto: STRIKE_TXT },
  { numero: 7, situacion: 'Palabras altisonantes, maltrato o pedir dinero a las familias', esStrike: false, tipo: 'BAJA', consecuenciaTexto: 'Baja de la agencia' },
  { numero: 11, situacion: 'No cubre 25 h mínimo durante 2 meses seguidos', esStrike: false, tipo: 'BAJA', consecuenciaTexto: 'Baja de la agencia' },
  { numero: 14, situacion: 'Calificación menor a 7.5 en la evaluación semestral', esStrike: false, tipo: 'PRUEBA', consecuenciaTexto: '1 mes de prueba' },
  { numero: 10, situacion: 'No envía justificante médico de un servicio que no cubrió', esStrike: false, tipo: 'DESCONTAR_HORAS', consecuenciaTexto: 'Descontar las horas del servicio del siguiente pago' },
  { numero: 15, situacion: 'Otro (describe qué pasó)', esStrike: true, consecuenciaTexto: STRIKE_TXT, notaObligatoria: true },
  // --- No culposas / justificadas (Jackie, 2026-08): solo se registran ---
  { numero: 20, situacion: 'Enfermedad, incapacidad, lesión o accidente', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 21, situacion: 'Enfermedad, hospitalización, emergencia o fallecimiento de un familiar de primer grado', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 22, situacion: 'Accidente vehicular', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 23, situacion: 'Avería mecánica del vehículo', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 24, situacion: 'Retraso por condiciones climáticas', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 25, situacion: 'Retraso por bloqueos viales o cierres de carretera', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 26, situacion: 'Interrupción del transporte público', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 27, situacion: 'Emergencia en el domicilio (fuga de gas, incendio, inundación, etc.)', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 28, situacion: 'Emergencia relacionada con un hijo menor de edad o dependiente', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 29, situacion: 'Comparecencia obligatoria ante una autoridad', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 30, situacion: 'Asalto, robo o situación de inseguridad durante el traslado', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 31, situacion: 'Procedimiento médico indispensable e impostergable', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT },
  { numero: 32, situacion: 'Otra (justificada — describe qué pasó)', esStrike: false, noCulposa: true, consecuenciaTexto: NO_CULPOSA_TXT, notaObligatoria: true },
];

export const REGLAS_VALIDAS = REGLAS_INCIDENCIA.map((r) => r.numero);
export const UMBRAL_STRIKES = 3;
export const PCT_STRIKES = 20;

export function reglaPorNumero(n: number): ReglaIncidencia | undefined {
  return REGLAS_INCIDENCIA.find((r) => r.numero === n);
}
