'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { api, type PilarEval, type EvaluacionData, type NotasEval, type ClavePilar } from '@/lib/api';
import { Seccion } from '@/components/seccion';
import { inicioSemana, sumarSemanas, etiquetaSemana } from '@/lib/semana';
import { cn } from '@/lib/utils';

const CLAVES: ClavePilar[] = [
  'atencionInfantil',
  'cumplimientoServicio',
  'comunicacion',
  'profesionalismo',
  'puntualidad',
];
const VACIAS: NotasEval = {
  atencionInfantil: 0,
  cumplimientoServicio: 0,
  comunicacion: 0,
  profesionalismo: 0,
  puntualidad: 0,
};

/** Evaluación de desempeño semanal (coordinación). 5 pilares 1-10 ponderados;
 *  muestra las incidencias de la semana por pilar (la coordinación baja la nota). */
export function EvaluacionNannie({ nannieId }: { nannieId: string }) {
  const [pilares, setPilares] = useState<PilarEval[]>([]);
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()));
  const [data, setData] = useState<EvaluacionData | null>(null);
  const [notas, setNotas] = useState<NotasEval>(VACIAS);
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.pilaresEval().then(setPilares).catch(() => undefined);
  }, []);

  const semanaISO = semana.toISOString().slice(0, 10);
  const cargar = useCallback(() => {
    api
      .evaluacionDeNannie(nannieId, semanaISO)
      .then((d) => {
        setData(d);
        setNotas(
          d.evaluacion
            ? {
                atencionInfantil: d.evaluacion.atencionInfantil,
                cumplimientoServicio: d.evaluacion.cumplimientoServicio,
                comunicacion: d.evaluacion.comunicacion,
                profesionalismo: d.evaluacion.profesionalismo,
                puntualidad: d.evaluacion.puntualidad,
              }
            : VACIAS,
        );
        setNota(d.evaluacion?.nota ?? '');
        setMsg('');
      })
      .catch(() => setData(null));
  }, [nannieId, semanaISO]);
  useEffect(cargar, [cargar]);

  const pesoDe = (c: ClavePilar) => pilares.find((p) => p.clave === c)?.peso ?? 0;
  const calif = CLAVES.reduce((s, c) => s + notas[c] * pesoDe(c), 0);
  const completo = CLAVES.every((c) => notas[c] >= 1);

  async function guardar() {
    if (!completo) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await api.guardarEvaluacion(nannieId, { semana: semanaISO, ...notas, nota: nota.trim() || undefined });
      setMsg(`Guardado · ${r.calificacion.toFixed(2)}/10`);
      cargar();
    } catch {
      setMsg('No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  const subtitulo = data?.evaluacion
    ? `Semana calificada: ${data.evaluacion.calificacion.toFixed(1)}/10`
    : 'Sin evaluar esta semana';

  return (
    <Seccion icon={Star} title="Evaluación" tint="ambar" subtitle={subtitulo} defaultOpen={false}>
      <div className="mb-3 flex items-center justify-center gap-3">
        <button
          onClick={() => setSemana((s) => sumarSemanas(s, -1))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[9rem] text-center text-sm font-semibold text-texto-fuerte">{etiquetaSemana(semana)}</span>
        <button
          onClick={() => setSemana((s) => sumarSemanas(s, 1))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {pilares.map((p) => {
          const incs = data?.incidenciasSemana.filter((i) => i.pilar === p.clave) ?? [];
          return (
            <div key={p.clave} className="rounded-xl border border-borde p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-texto-fuerte">{p.titulo}</span>
                <span className="shrink-0 rounded-full bg-fondo px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
                  {Math.round(p.peso * 100)}%
                </span>
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
                      notas[p.clave] === n
                        ? 'bg-marca-azul text-white'
                        : 'border border-borde text-texto-suave hover:bg-fondo',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {incs.length > 0 && (
                <div className="mt-2 flex flex-wrap items-start gap-1.5">
                  {incs.map((i) => (
                    <span
                      key={i.id}
                      className="inline-flex items-center gap-1 rounded-full bg-[#5B292D]/8 px-2 py-0.5 text-[10px] text-[#5B292D]"
                      title="Incidencia de esta semana — considérala al calificar"
                    >
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
          placeholder="Observaciones de la semana"
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm text-texto-suave">
          Calificación: <strong className="text-texto-fuerte">{calif.toFixed(2)}/10</strong>
        </span>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-texto-suave">{msg}</span>}
          <button
            onClick={guardar}
            disabled={busy || !completo}
            className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar evaluación'}
          </button>
        </div>
      </div>

      {data && data.historial.length > 0 && (
        <div className="mt-3 border-t border-borde pt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-texto-suave">Histórico</p>
          <div className="flex flex-wrap gap-2">
            {data.historial.map((h) => (
              <span key={h.semana} className="rounded-full bg-fondo px-2.5 py-1 text-[11px] text-texto-suave">
                {h.semana}: <strong className="text-texto-fuerte">{h.calificacion.toFixed(1)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </Seccion>
  );
}
