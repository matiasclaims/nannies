/**
 * Menú de COBRO a familias para servicios INDIVIDUALES (fuente: "Nuestros
 * precios", verificado). Los papás eligen la opción según los beneficios.
 * En el sistema: estas 5 opciones + campo libre (casos variables, p. ej.
 * ludoteca por estación). Mismo precio en Toluca y Querétaro. Montos en MXN.
 *
 * El cobro de paquetes NO vive aquí (es precio fijo por tramo): ver
 * paquetes.tarifa.ts. El cobro individual se captura al CREAR el servicio.
 */
export interface OpcionCobroIndividual {
  precio: number;
  incluye: string;
}

export const COBRO_INDIVIDUAL_OPCIONES: readonly OpcionCobroIndividual[] = [
  { precio: 95, incluye: 'Todos los cuidados' },
  { precio: 110, incluye: 'Todos los cuidados + Actividades planeadas' },
  { precio: 125, incluye: 'Todos los cuidados + Actividades planeadas + Seguimiento cada hora' },
  { precio: 140, incluye: 'Lo anterior + Reporte final' },
  { precio: 160, incluye: 'Lo anterior + Cobertura médica' },
];
