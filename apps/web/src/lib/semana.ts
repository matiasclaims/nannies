/** Utilidades de semana (DOMINGO a SÁBADO) para el calendario de M1.
 *  La semana empieza domingo y cierra sábado (el pago es sábado). */

export interface DiaSemana {
  fecha: string; // YYYY-MM-DD
  etiqueta: string; // "lun 14"
  esHoy: boolean;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' de HOY en México (America/Mexico_City).
 *  Clave: NO usar `new Date()` en UTC para "hoy". México va 6 h atrás, así que
 *  de 6 p.m. a medianoche (hora de México) el UTC ya es el día siguiente y la
 *  app creería que "hoy" es mañana (bug del reporte nocturno de servicios). */
export function hoyMX(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** HOY en México como Date a medianoche UTC. Úsalo como ancla de semana/mes en
 *  vez de `new Date()` (toda la aritmética de este archivo es en UTC). */
export function baseHoyMX(): Date {
  const [y, m, d] = hoyMX().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Domingo de la semana que contiene `base` (semana domingo→sábado). */
export function inicioSemana(base: Date): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // getUTCDay: 0 = domingo
  return d;
}

export function diasDeSemana(lunes: Date): DiaSemana[] {
  const hoy = hoyMX();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setUTCDate(lunes.getUTCDate() + i);
    const f = iso(d);
    return {
      fecha: f,
      etiqueta: d.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      esHoy: f === hoy,
    };
  });
}

export function sumarSemanas(lunes: Date, n: number): Date {
  const d = new Date(lunes);
  d.setUTCDate(lunes.getUTCDate() + n * 7);
  return d;
}

export function rangoSemana(lunes: Date): { desde: string; hasta: string } {
  const fin = new Date(lunes);
  fin.setUTCDate(lunes.getUTCDate() + 6);
  return { desde: iso(lunes), hasta: iso(fin) };
}

export function etiquetaSemana(lunes: Date): string {
  const fin = new Date(lunes);
  fin.setUTCDate(lunes.getUTCDate() + 6);
  const f = (d: Date) =>
    d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${f(lunes)} – ${f(fin)}`;
}

// --- Mes (para la vista mensual de la agenda de la nannie) ---

/** Primer día del mes que contiene `base` (en UTC). */
export function inicioMes(base: Date): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
}

/** Todos los días del mes de `ref`, como DiaSemana (para el grid mensual). */
export function diasDeMes(ref: Date): DiaSemana[] {
  const hoy = hoyMX();
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // último día del mes
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(Date.UTC(y, m, i + 1));
    const f = iso(d);
    return {
      fecha: f,
      etiqueta: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }),
      esHoy: f === hoy,
    };
  });
}

export function sumarMeses(ref: Date, n: number): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + n, 1));
}

export function etiquetaMes(ref: Date): string {
  return ref.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
