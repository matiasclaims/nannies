/**
 * Tabulador de PAGO a nannies (fuente: "Propuesta económica 2026" / PE 2026.pdf,
 * verificado exacto). Cada servicio se paga según su fila (tipo + duración/tamaño)
 * y la COLUMNA del nivel-tarifa vigente ese mes. Montos en MXN.
 *
 * El nivel-tarifa mensual lo fija el cierre de mes (§6.2). Las 5 columnas
 * corresponden al enum NivelTarifa: BASE, TARIFA_25HRS, ROOKIE, JUNIOR, SENIOR.
 */
import type { NivelTarifa } from '@prisma/client';

export type PagoPorNivel = Record<NivelTarifa, number>;

export interface FilaTabulador {
  clave: string; // identificador estable de la fila
  etiqueta: string; // texto legible
  pago: PagoPorNivel;
}

const fila = (
  clave: string,
  etiqueta: string,
  base: number,
  h25: number,
  rookie: number,
  junior: number,
  senior: number,
): FilaTabulador => ({
  clave,
  etiqueta,
  pago: { BASE: base, TARIFA_25HRS: h25, ROOKIE: rookie, JUNIOR: junior, SENIOR: senior },
});

export const TABULADOR_PAGO: readonly FilaTabulador[] = [
  // Servicios generales por duración (Daycare/Nightcare/Acompañamiento/Express/Foránea)
  fila('GRAL_3', '3 hrs', 196.5, 222, 228.6, 237, 241.2),
  fila('GRAL_4', '4 hrs', 230, 255, 262.6, 269.8, 274.5),
  fila('GRAL_5', '5 hrs', 255, 275, 288.4, 295.6, 304.3),
  fila('GRAL_6', '6 hrs', 295, 315, 327.6, 335.4, 352.9),
  fila('GRAL_7_9', '7–9 hrs', 400, 465, 468.8, 482.2, 506),
  // Paquetes (pago por el paquete completo)
  fila('PAQ_10', 'Paquete 10', 880, 935, 948.2, 983.8, 1014.4),
  fila('PAQ_20', 'Paquete 20', 1700, 1750, 1790.2, 1861.8, 1921.3),
  fila('PAQ_30', 'Paquete 30', 2150, 2210, 2295.5, 2360.4, 2420),
  fila('PAQ_40', 'Paquete 40', 2450, 2510, 2571.3, 2680, 2695.1),
  fila('PAQ_50', 'Paquete 50', 2485, 2545, 2570, 2710, 2740.6),
  // Fiesta / Play Date por duración
  fila('FIESTA_3', 'Fiesta 3 hrs', 390, 420, 432, 449.4, 462),
  fila('FIESTA_4', 'Fiesta 4 hrs', 520, 540, 556.2, 578.1, 595),
  fila('FIESTA_5', 'Fiesta 5 hrs', 650, 675, 690, 717, 735),
  fila('FIESTA_6', 'Fiesta 6 hrs', 780, 810, 824.4, 836.7, 889.3),
];

export function filaPorClave(clave: string): FilaTabulador | undefined {
  return TABULADOR_PAGO.find((f) => f.clave === clave);
}
