'use client';

import { OPCIONES_HORA } from '@/lib/horas';

/** Selector de hora en bloques de 30 minutos (reemplaza el <input type="time">
 *  para que SIEMPRE se vea de 30 en 30, no minuto por minuto). */
export function HoraSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {/* Conserva un valor fuera de la rejilla (p. ej. datos viejos como 23:59) */}
      {value && !OPCIONES_HORA.includes(value) && <option value={value}>{value}</option>}
      {OPCIONES_HORA.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
}
