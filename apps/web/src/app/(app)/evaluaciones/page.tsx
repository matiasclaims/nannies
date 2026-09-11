'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star, TriangleAlert, X, Package, User } from 'lucide-react';
import {
  api,
  type PilarEval,
  type PendienteEvalCoord,
  type DetalleEvalCoord,
  type NotasEval,
  type ClavePilar,
} from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { cn } from '@/lib/utils';

const CLAVES: ClavePilar[] = ['atencionInfantil', 'cumplimientoServicio', 'comunicacion', 'profesionalismo', 'puntualidad'];
const VACIAS: NotasEval = { atencionInfantil: 0, cumplimientoServicio: 0, comunicacion: 0, profesionalismo: 0, puntualidad: 0 };

/** M4 (Paula 2026-09-03) · Bandeja de evaluaciones de coordinación POR SERVICIO.
 *  Individuales COMPLETADOS + paquetes CONSUMIDOS sin evaluar. Puede quedar
 *  pendiente sin bloquear. */
export default function EvaluacionesPage() {
  const [pendientes, setPendientes] = useState<PendienteEvalCoord[] | null>(null);
  const [sel, setSel] = useState<PendienteEvalCoord | null>(null);

  const cargar = useCallback(() => {
    api.evalCoordPendientes().then((r) => setPendientes(r.pendientes)).catch(() => setPendientes([]));
  }, []);
  useEffect(cargar, [cargar]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center gap-2">
        <Star className="h-6 w-6 text-marca-azul" />
        <div>
          <h1 className="text-lg font-bold text-texto-fuerte">Evaluaciones pendientes</h1>
          <p className="text-xs text-texto-suave">
            Un servicio individual al completarse; un paquete al agotarse. Puedes dejarlas pendientes.
          </p>
        </div>
      </header>

      {pendientes === null ? (
        <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>
      ) : pendientes.length === 0 ? (
        <div className="rounded-2xl bg-panel p-8 text-center text-sm text-texto-suave shadow-card">
          No hay evaluaciones pendientes. ¡Al día!
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-panel shadow-card">
          {pendientes.map((p) => (
            <button
              key={`${p.tipo}-${p.id}-${p.nannieId}`}
              onClick={() => setSel(p)}
              className="flex w-full items-center gap-3 border-b border-borde px-4 py-3 text-left last:border-0 hover:bg-fondo"
            >
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', p.tipo === 'PAQUETE' ? 'bg-marca-azul/10 text-marca-azul' : 'bg-fondo text-texto-suave')}>
                {p.tipo === 'PAQUETE' ? <Package className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-texto-fuerte">{p.nannie}</span>
                <span className="block truncate text-xs text-texto-suave">
                  {p.familia} · {p.tipo === 'PAQUETE' ? p.detalle : TIPO_LABEL[p.detalle as keyof typeof TIPO_LABEL] ?? p.detalle} · {p.fecha}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-fondo px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
                {p.tipo === 'PAQUETE' ? 'Paquete' : 'Individual'}
              </span>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <ModalEvaluar
          item={sel}
          onClose={() => setSel(null)}
          onGuardado={() => {
            setSel(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalEvaluar({ item, onClose, onGuardado }: { item: PendienteEvalCoord; onClose: () => void; onGuardado: () => void }) {
  const [pilares, setPilares] = useState<PilarEval[]>([]);
  const [detalle, setDetalle] = useState<DetalleEvalCoord | null>(null);
  const [notas, setNotas] = useState<NotasEval>(VACIAS);
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.pilaresEval().then(setPilares).catch(() => undefined);
  }, []);

  useEffect(() => {
    const p =
      item.tipo === 'PAQUETE'
        ? api.evalCoordPaquete(item.id, item.nannieId)
        : api.evalCoordServicio(item.id);
    p
      .then((d) => {
        setDetalle(d);
        if (d.evaluacion) {
          setNotas({
            atencionInfantil: d.evaluacion.atencionInfantil,
            cumplimientoServicio: d.evaluacion.cumplimientoServicio,
            comunicacion: d.evaluacion.comunicacion,
            profesionalismo: d.evaluacion.profesionalismo,
            puntualidad: d.evaluacion.puntualidad,
          });
          setNota(d.evaluacion.nota ?? '');
        }
      })
      .catch(() => setMsg('No se pudo cargar el detalle.'));
  }, [item]);

  const pesoDe = (c: ClavePilar) => pilares.find((x) => x.clave === c)?.peso ?? 0;
  const calif = CLAVES.reduce((s, c) => s + notas[c] * pesoDe(c), 0);
  const completo = CLAVES.every((c) => notas[c] >= 1);

  async function guardar() {
    if (!completo) return;
    setBusy(true);
    setMsg('');
    try {
      const body = { ...notas, nota: nota.trim() || undefined };
      if (item.tipo === 'PAQUETE') await api.guardarEvalCoordPaquete(item.id, item.nannieId, body);
      else await api.guardarEvalCoordServicio(item.id, body);
      onGuardado();
    } catch {
      setMsg('No se pudo guardar.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-texto-fuerte">{item.nannie}</h2>
            <p className="text-xs text-texto-suave">
              {item.familia} · {item.tipo === 'PAQUETE' ? item.detalle : TIPO_LABEL[item.detalle as keyof typeof TIPO_LABEL] ?? item.detalle} · {item.fecha}
            </p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-texto-suave hover:bg-fondo">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {pilares.map((p) => {
            const incs = detalle?.incidencias.filter((i) => i.pilar === p.clave) ?? [];
            return (
              <div key={p.clave} className="rounded-xl border border-borde p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-texto-fuerte">{p.titulo}</span>
                  <span className="shrink-0 rounded-full bg-fondo px-2 py-0.5 text-[10px] font-semibold text-texto-suave">{Math.round(p.peso * 100)}%</span>
                </div>
                <p className="mt-0.5 text-[11px] text-texto-suave">{p.incluye}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNotas((v) => ({ ...v, [p.clave]: n }))}
                      className={cn(
                        'h-7 w-7 rounded-lg text-xs font-semibold transition',
                        notas[p.clave] === n ? 'bg-marca-azul text-white' : 'border border-borde text-texto-suave hover:bg-fondo',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {incs.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-start gap-1.5">
                    {incs.map((i) => (
                      <span key={i.id} className="inline-flex items-center gap-1 rounded-full bg-[#5B292D]/8 px-2 py-0.5 text-[10px] text-[#5B292D]" title="Incidencia — considérala al calificar">
                        <TriangleAlert className="h-3 w-3" />
                        {i.situacion}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Nota (opcional)</span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul"
            placeholder="Observaciones de este servicio"
          />
        </label>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-sm text-texto-suave">
            Calificación: <strong className="text-texto-fuerte">{calif.toFixed(2)}/10</strong>
          </span>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs text-marca-rojo">{msg}</span>}
            <button onClick={guardar} disabled={busy || !completo} className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Guardando…' : 'Guardar evaluación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
