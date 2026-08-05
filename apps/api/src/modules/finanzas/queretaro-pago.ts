/**
 * Pago a la nannie en QUERÉTARO: por zona, SIN nivel (no hay programa de
 * crecimiento). Individual y fiesta por hora; paquete prorrateado por hora.
 * NO se parte día/noche (va por duración total). Ludoteca no existe en Qro.
 */
import type { TipoServicio, Formato } from '@prisma/client';
import { tarifasZonaQro } from './queretaro-tarifas';
import type { PagoServicio, OpcionesPago } from './pago-servicio';

const redondea2 = (n: number) => Math.round(n * 100) / 100;

export function pagoQueretaro(
  tipo: TipoServicio,
  duracionHoras: number,
  formato: Formato,
  zona: string,
  opts: OpcionesPago = {},
): PagoServicio {
  const t = tarifasZonaQro(zona);
  if (!t) {
    return { monto: null, clave: null, motivo: `Zona de Querétaro no reconocida: "${zona}".` };
  }

  if (formato === 'PAQUETE') {
    const n = opts.paqueteHoras;
    if (!n || !(n === 10 || n === 20 || n === 30)) {
      return { monto: null, clave: null, motivo: 'Paquete de Querétaro debe ser 10, 20 o 30 h.' };
    }
    const porHora = t.pagoPaquete[n] / n;
    return { monto: redondea2(porHora * duracionHoras), clave: `QRO_PAQ_${n}` };
  }

  if (tipo === 'LUDOTECA_MOVIL') {
    return { monto: null, clave: null, motivo: 'Querétaro no ofrece Ludoteca.' };
  }

  if (tipo === 'NANNIE_FIESTA_PLAYDATE') {
    return { monto: redondea2(t.pagoFiestaHora * duracionHoras), clave: 'QRO_FIESTA' };
  }

  // Individuales (Daycare/Nightcare/Acompañamiento/Express/Foránea): por hora.
  return { monto: redondea2(t.pagoIndividualHora * duracionHoras), clave: 'QRO_INDIV' };
}
