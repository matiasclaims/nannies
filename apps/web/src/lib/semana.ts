/** Utilidades de semana (lunes a domingo) para el calendario de M1. */

export interface DiaSemana {
  fecha: string; // YYYY-MM-DD
  etiqueta: string; // "lun 14"
  esHoy: boolean;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana que contiene `base`. */
export function inicioSemana(base: Date): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export function diasDeSemana(lunes: Date): DiaSemana[] {
  const hoy = iso(new Date());
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
