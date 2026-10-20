'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Printer } from 'lucide-react';
import { api, type PlaneacionItem } from '@/lib/api';
import { cn } from '@/lib/utils';

const vacia = (): PlaneacionItem => ({ hora: '', actividad: '', objetivo: '', material: '' });

/** Constructor de la planeación de un servicio: filas de Hora/Actividad/Objetivo/
 *  Material, con "Agregar otro". La capturan coordinación y la nannie asignada;
 *  queda ligada al servicio y se puede imprimir en PDF (marca Nannies). */
export function PlaneacionModal({
  servicioId,
  encabezado,
  onCerrar,
  onGuardado,
}: {
  servicioId: string;
  encabezado?: string;
  onCerrar: () => void;
  onGuardado?: () => void;
}) {
  const [filas, setFilas] = useState<PlaneacionItem[]>([vacia()]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .planeacionDeServicio(servicioId)
      .then((p) => {
        if (p && p.items.length > 0) setFilas(p.items);
      })
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, [servicioId]);

  const set = (i: number, campo: keyof PlaneacionItem, v: string) =>
    setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: v } : f)));
  const agregar = () => setFilas((prev) => [...prev, vacia()]);
  const quitar = (i: number) => setFilas((prev) => (prev.length === 1 ? [vacia()] : prev.filter((_, j) => j !== i)));

  async function guardar() {
    const items = filas
      .map((f) => ({ hora: f.hora.trim(), actividad: f.actividad.trim(), objetivo: f.objetivo.trim(), material: f.material.trim() }))
      .filter((f) => f.actividad.length > 0);
    if (items.length === 0) {
      setError('Agrega al menos una actividad.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await api.guardarPlaneacion(servicioId, items);
      onGuardado?.();
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la planeación.');
      setGuardando(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-borde bg-white px-2 py-1.5 text-sm outline-none focus:border-marca-azul';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onCerrar}>
      <div className="w-full max-w-2xl rounded-2xl bg-panel p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">Planeación del servicio</h2>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte">
            <X className="h-4 w-4" />
          </button>
        </div>
        {encabezado && <p className="mb-3 text-xs text-texto-suave">{encabezado}</p>}

        {cargando ? (
          <p className="py-6 text-center text-sm text-texto-suave">Cargando…</p>
        ) : (
          <>
            {/* Cabecera de columnas (solo en pantallas anchas). */}
            <div className="mb-1 hidden gap-2 px-1 text-[11px] font-medium text-texto-suave sm:grid sm:grid-cols-[5.5rem_1fr_1fr_1fr_1.5rem]">
              <span>Hora</span>
              <span>Actividad</span>
              <span>Objetivo</span>
              <span>Material</span>
              <span />
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {filas.map((f, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-borde p-2 sm:grid-cols-[5.5rem_1fr_1fr_1fr_1.5rem] sm:items-center sm:border-0 sm:p-0"
                >
                  <input value={f.hora} onChange={(e) => set(i, 'hora', e.target.value)} placeholder="Hora" className={inputCls} />
                  <input value={f.actividad} onChange={(e) => set(i, 'actividad', e.target.value)} placeholder="Actividad" className={inputCls} />
                  <input value={f.objetivo} onChange={(e) => set(i, 'objetivo', e.target.value)} placeholder="Objetivo" className={inputCls} />
                  <input value={f.material} onChange={(e) => set(i, 'material', e.target.value)} placeholder="Material" className={inputCls} />
                  <button
                    onClick={() => quitar(i)}
                    title="Quitar fila"
                    className="justify-self-end text-texto-suave hover:text-marca-rojo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={agregar}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-marca-azul/50 px-3 py-1.5 text-xs font-medium text-marca-azul hover:bg-marca-azul/5"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar otro
            </button>

            {error && <p className="mt-2 text-xs text-marca-rojo">{error}</p>}

            <div className="mt-4 flex items-center justify-between gap-2">
              <a
                href={`/planeacion/${servicioId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-texto-suave hover:bg-fondo"
              >
                <Printer className="h-3.5 w-3.5" /> Ver / Imprimir PDF
              </a>
              <div className="flex gap-2">
                <button onClick={onCerrar} className="rounded-lg border border-borde px-3 py-1.5 text-sm text-texto-suave hover:bg-fondo">
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className={cn('rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50')}
                >
                  {guardando ? 'Guardando…' : 'Guardar planeación'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
