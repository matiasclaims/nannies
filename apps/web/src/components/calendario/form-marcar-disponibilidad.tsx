'use client';

import { useState } from 'react';
import { api, ApiError, type EstadoDisponibilidad } from '@/lib/api';
import { HoraSelect } from '@/components/hora-select';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Modo = 'especificos' | 'repetir';

/** Autoservicio: marca la disponibilidad PROPIA. Dos modos: días específicos
 *  (tocar fechas en el calendario, para un día suelto o una sola semana) o
 *  repetir semanal (días de la semana × N semanas, para lo recurrente). */
export function FormMarcarDisponibilidad({
  fechaInicial,
  onGuardado,
}: {
  fechaInicial: string;
  onGuardado: () => Promise<void> | void;
}) {
  const [modo, setModo] = useState<Modo>('especificos');

  // --- Días específicos (calendario) ---
  const [fechasSel, setFechasSel] = useState<Set<string>>(() => new Set([fechaInicial]));
  const [verMes, setVerMes] = useState(() => {
    const d = new Date(`${fechaInicial}T00:00:00`);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // --- Repetir semanal ---
  const [desdeSemana, setDesdeSemana] = useState(fechaInicial);
  const [dias, setDias] = useState<Set<number>>(
    () => new Set([new Date(`${fechaInicial}T00:00:00`).getDay()]),
  );
  const [semanas, setSemanas] = useState(1);

  // --- Compartido ---
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [estado, setEstado] = useState<EstadoDisponibilidad>('DISPONIBLE');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const toggleDia = (d: number) =>
    setDias((prev) => {
      const s = new Set(prev);
      if (s.has(d)) s.delete(d);
      else s.add(d);
      return s;
    });

  const toggleFecha = (iso: string) =>
    setFechasSel((prev) => {
      const s = new Set(prev);
      if (s.has(iso)) s.delete(iso);
      else s.add(iso);
      return s;
    });

  const hoy0 = new Date();
  hoy0.setHours(0, 0, 0, 0);

  /** Repetir: para cada día elegido, en cada una de las N semanas desde la
   *  semana indicada; solo de hoy en adelante. */
  function armarFechasRepetir(): string[] {
    const base = new Date(`${desdeSemana}T00:00:00`);
    const domingo = new Date(base);
    domingo.setDate(base.getDate() - base.getDay());
    const fechas: string[] = [];
    for (let w = 0; w < Math.max(1, semanas); w++) {
      for (const d of [...dias].sort((a, b) => a - b)) {
        const f = new Date(domingo);
        f.setDate(domingo.getDate() + d + w * 7);
        if (f >= hoy0) fechas.push(fmt(f));
      }
    }
    return fechas;
  }

  /** Días específicos: las fechas tocadas en el calendario, de hoy en adelante. */
  function armarFechasEspecificas(): string[] {
    return [...fechasSel].filter((iso) => new Date(`${iso}T00:00:00`) >= hoy0).sort();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    let fechas: string[];
    if (modo === 'especificos') {
      fechas = armarFechasEspecificas();
      if (fechas.length === 0) return setError('Toca al menos un día (de hoy en adelante) en el calendario.');
    } else {
      if (dias.size === 0) return setError('Elige al menos un día.');
      fechas = armarFechasRepetir();
      if (fechas.length === 0) return setError('No hay fechas futuras con esos días. Ajusta la semana o los días.');
    }
    setGuardando(true);
    try {
      const r = await api.crearDisponibilidadVarias({ fechas, horaInicio, horaFin, estado });
      const om = r.omitidas.length;
      setMsg(
        `Se agregaron ${r.creados} bloque${r.creados === 1 ? '' : 's'}` +
          (om > 0 ? ` · ${om} se omitieron por traslape con lo que ya tenías.` : '.'),
      );
      await onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  const tabBtn = (m: Modo, etiqueta: string) => (
    <button
      type="button"
      onClick={() => setModo(m)}
      className={cn(
        'flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
        modo === m ? 'bg-marca-azul text-white' : 'bg-fondo text-texto-suave hover:text-texto-fuerte',
      )}
    >
      {etiqueta}
    </button>
  );

  return (
    <form onSubmit={guardar} className="space-y-3">
      <div className="flex gap-1.5">
        {tabBtn('especificos', 'Días específicos')}
        {tabBtn('repetir', 'Repetir semanal')}
      </div>

      {modo === 'especificos' ? (
        <div>
          <span className="mb-1 block text-xs font-medium text-texto-suave">Toca los días que quieres marcar</span>
          <MiniCalendario
            y={verMes.y}
            m={verMes.m}
            seleccionadas={fechasSel}
            hoyISO={fmt(hoy0)}
            onMover={(y, m) => setVerMes({ y, m })}
            onToggle={toggleFecha}
          />
          <p className="mt-1 text-xs text-texto-suave">
            {armarFechasEspecificas().length} día{armarFechasEspecificas().length === 1 ? '' : 's'} seleccionado
            {armarFechasEspecificas().length === 1 ? '' : 's'}.
          </p>
        </div>
      ) : (
        <>
          <div>
            <span className="mb-1 block text-xs font-medium text-texto-suave">Días de la semana</span>
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((etiqueta, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDia(d)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition',
                    dias.has(d)
                      ? 'bg-marca-azul text-white'
                      : 'border border-borde text-texto-suave hover:bg-fondo',
                  )}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">A partir de la semana de</span>
              <input
                type="date"
                required
                value={desdeSemana}
                onChange={(e) => setDesdeSemana(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex items-end">
              <span className="flex w-full items-center gap-2 rounded-xl bg-fondo px-3 py-2 text-sm text-texto-fuerte">
                Repetir
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={semanas}
                  onChange={(e) => setSemanas(Number(e.target.value))}
                  className="w-14 rounded-lg border border-borde bg-white px-2 py-1 text-sm outline-none focus:border-marca-azul"
                />
                sem.
              </span>
            </label>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Desde</span>
          <HoraSelect value={horaInicio} onChange={setHoraInicio} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Hasta</span>
          <HoraSelect value={horaFin} onChange={setHoraFin} className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-texto-suave">Estado</span>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoDisponibilidad)}
          className={inputCls}
        >
          <option value="DISPONIBLE">Disponible</option>
          <option value="BLOQUEADO">Bloqueado</option>
        </select>
      </label>

      {error && <p className="text-sm text-marca-rojo">{error}</p>}
      {msg && <p className="text-sm text-[#3b6d11]">{msg}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-xl bg-marca-azul py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Agregar disponibilidad'}
      </button>
    </form>
  );
}

/** Mini-calendario de un mes; marca/desmarca varias fechas. Deshabilita el pasado. */
function MiniCalendario({
  y,
  m,
  seleccionadas,
  hoyISO,
  onMover,
  onToggle,
}: {
  y: number;
  m: number;
  seleccionadas: Set<string>;
  hoyISO: string;
  onMover: (y: number, m: number) => void;
  onToggle: (iso: string) => void;
}) {
  const primerDia = new Date(y, m, 1).getDay();
  const diasEnMes = new Date(y, m + 1, 0).getDate();
  const etiqueta = new Date(y, m, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const mueve = (paso: number) => {
    const d = new Date(y, m + paso, 1);
    onMover(d.getFullYear(), d.getMonth());
  };
  return (
    <div className="rounded-xl border border-borde bg-white p-2">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" onClick={() => mueve(-1)} className="rounded px-2 py-0.5 text-texto-suave hover:bg-fondo">‹</button>
        <span className="text-xs font-semibold capitalize text-texto-fuerte">{etiqueta}</span>
        <button type="button" onClick={() => mueve(1)} className="rounded px-2 py-0.5 text-texto-suave hover:bg-fondo">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-texto-suave">
        {DIAS.map((d) => (
          <span key={d}>{d[0]}</span>
        ))}
        {Array.from({ length: primerDia }).map((_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const iso = `${y}-${pad(m + 1)}-${pad(dia)}`;
          const sel = seleccionadas.has(iso);
          const pasado = iso < hoyISO;
          return (
            <button
              key={iso}
              type="button"
              disabled={pasado}
              onClick={() => onToggle(iso)}
              className={cn(
                'aspect-square rounded text-[11px] font-medium transition',
                pasado
                  ? 'cursor-not-allowed text-borde'
                  : sel
                    ? 'bg-marca-azul text-white'
                    : 'text-texto-fuerte hover:bg-fondo',
              )}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
