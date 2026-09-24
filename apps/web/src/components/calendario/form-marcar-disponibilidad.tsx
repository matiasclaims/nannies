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

/** Autoservicio: marca la disponibilidad PROPIA en VARIOS días de un jalón. */
export function FormMarcarDisponibilidad({
  fechaInicial,
  onGuardado,
}: {
  fechaInicial: string;
  onGuardado: () => Promise<void> | void;
}) {
  const [desdeSemana, setDesdeSemana] = useState(fechaInicial);
  // Días de la semana seleccionados (0=Dom … 6=Sáb). Arranca con el de la fecha.
  const [dias, setDias] = useState<Set<number>>(
    () => new Set([new Date(`${fechaInicial}T00:00:00`).getDay()]),
  );
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [estado, setEstado] = useState<EstadoDisponibilidad>('DISPONIBLE');
  const [semanas, setSemanas] = useState(1);
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

  /** Arma las fechas: para cada día elegido, en cada una de las N semanas desde
   *  la semana indicada; solo de hoy en adelante (no se marca el pasado). */
  function armarFechas(): string[] {
    const base = new Date(`${desdeSemana}T00:00:00`);
    const domingo = new Date(base);
    domingo.setDate(base.getDate() - base.getDay()); // domingo de esa semana
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechas: string[] = [];
    for (let w = 0; w < Math.max(1, semanas); w++) {
      for (const d of [...dias].sort((a, b) => a - b)) {
        const f = new Date(domingo);
        f.setDate(domingo.getDate() + d + w * 7);
        if (f >= hoy) fechas.push(fmt(f));
      }
    }
    return fechas;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (dias.size === 0) return setError('Elige al menos un día.');
    const fechas = armarFechas();
    if (fechas.length === 0) return setError('No hay fechas futuras con esos días. Ajusta la semana o los días.');
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

  return (
    <form onSubmit={guardar} className="space-y-3">
      <div>
        <span className="mb-1 block text-xs font-medium text-texto-suave">Días</span>
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
          <span className="mb-1 block text-xs font-medium text-texto-suave">Desde</span>
          <HoraSelect value={horaInicio} onChange={setHoraInicio} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Hasta</span>
          <HoraSelect value={horaFin} onChange={setHoraFin} className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
      </div>

      <label className="flex items-center gap-2 rounded-xl bg-fondo p-3 text-sm text-texto-fuerte">
        Repetir por
        <input
          type="number"
          min={1}
          max={52}
          value={semanas}
          onChange={(e) => setSemanas(Number(e.target.value))}
          className="w-16 rounded-lg border border-borde bg-white px-2 py-1 text-sm outline-none focus:border-marca-azul"
        />
        semana{semanas === 1 ? '' : 's'}
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
