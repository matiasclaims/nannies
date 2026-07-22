/**
 * Tabulador de paquetes de horas (fuente: arte de precios Nannies 2026).
 * El precio total por paquete es fijo por tramo de horas. El COBRO real,
 * el pago y el margen se cablean en M3 · Finanzas; aquí solo se registra el
 * precio de lista para dejar creado el saldo de horas (M2 solo consume horas).
 */
export interface TramoPaquete {
  horas: number;
  precioTotal: number;
}

export const PAQUETES_TARIFA: readonly TramoPaquete[] = [
  { horas: 10, precioTotal: 1550 },
  { horas: 20, precioTotal: 2850 },
  { horas: 30, precioTotal: 3750 },
  { horas: 40, precioTotal: 3800 },
  { horas: 50, precioTotal: 4100 },
];

export function tramoPorHoras(horas: number): TramoPaquete | undefined {
  return PAQUETES_TARIFA.find((t) => t.horas === horas);
}
