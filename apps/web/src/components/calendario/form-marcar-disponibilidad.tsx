'use client';

import { useState } from 'react';
import { api, type NuevaDisponibilidad } from '@/lib/api';

const inputCls =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

/** Formulario de autoservicio: marca la disponibilidad PROPIA (backend usa el token). */
export function FormMarcarDisponibilidad({
  fechaInicial,
  onGuardado,
}: {
  fechaInicial: string;
  onGuardado: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<NuevaDisponibilidad>({
    fecha: fechaInicial,
    horaInicio: '09:00',
    horaFin: '13:00',
    estado: 'DISPONIBLE',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api.crearDisponibilidad(form);
      await onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-texto-suave">Fecha</span>
        <input
          type="date"
          required
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Desde</span>
          <input
            type="time"
            required
            value={form.horaInicio}
            onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Hasta</span>
          <input
            type="time"
            required
            value={form.horaFin}
            onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-texto-suave">Estado</span>
        <select
          value={form.estado}
          onChange={(e) =>
            setForm({ ...form, estado: e.target.value as NuevaDisponibilidad['estado'] })
          }
          className={inputCls}
        >
          <option value="DISPONIBLE">Disponible</option>
          <option value="BLOQUEADO">Bloqueado</option>
          <option value="TEMPORAL">Bloqueo temporal</option>
        </select>
      </label>

      {form.estado === 'TEMPORAL' && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Reintegro</span>
          <input
            type="date"
            value={form.fechaReintegro ?? ''}
            onChange={(e) => setForm({ ...form, fechaReintegro: e.target.value })}
            className={inputCls}
          />
        </label>
      )}

      {error && <p className="text-sm text-marca-rojo">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-xl bg-marca-azul py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Agregar bloque'}
      </button>
    </form>
  );
}
