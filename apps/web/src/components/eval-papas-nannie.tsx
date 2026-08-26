'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star, AlertTriangle } from 'lucide-react';
import { Seccion } from '@/components/seccion';
import { api, type ResumenEvalNannie } from '@/lib/api';

/** M6 · 6.2 — Evaluación de papás en la ficha de la nannie (coordinación).
 *  Ve el promedio + respuestas individuales. Si el promedio baja de 7.5, avisa
 *  y —solo la Directora— puede ponerla en mes de prueba (ella decide). */
export function EvalPapasNannie({
  nannieId,
  esDirectora,
  estadoActual,
  onCambio,
}: {
  nannieId: string;
  esDirectora: boolean;
  estadoActual: string;
  onCambio: () => void | Promise<void>;
}) {
  const [data, setData] = useState<ResumenEvalNannie | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    api.resumenEvalNannie(nannieId).then(setData).catch(() => undefined);
  }, [nannieId]);
  useEffect(cargar, [cargar]);

  async function ponerEnPrueba() {
    setGuardando(true);
    try {
      await api.editarNannie(nannieId, { estado: 'PRUEBA' });
      await onCambio();
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  const subtitle = data && data.total > 0 ? `${data.promedio}/10 · ${data.total} ${data.total === 1 ? 'opinión' : 'opiniones'}` : 'Sin calificaciones aún';

  return (
    <Seccion icon={Star} title="Evaluación de papás" subtitle={subtitle} tint="morado" defaultOpen={false}>
      {!data || data.total === 0 ? (
        <p className="text-xs text-texto-suave">Aún no hay calificaciones de papás para esta nannie.</p>
      ) : (
        <div className="space-y-3">
          {data.alertaPrueba && (
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Promedio por debajo de 7.5 ({data.promedio})
              </p>
              <p className="mt-1">Reglamento #14: puede ir a mes de prueba. Tú decides.</p>
              {estadoActual === 'PRUEBA' ? (
                <p className="mt-2 font-semibold">Ya está en mes de prueba.</p>
              ) : (
                esDirectora && (
                  <button
                    onClick={ponerEnPrueba}
                    disabled={guardando}
                    className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
                  >
                    {guardando ? 'Aplicando…' : 'Poner en mes de prueba'}
                  </button>
                )
              )}
            </div>
          )}
          <div className="divide-y divide-borde">
            {data.respuestas.map((r, i) => (
              <div key={i} className="py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-texto-fuerte">{r.familia}</span>
                  <div className="flex items-center gap-2">
                    {r.volveriaContratar != null && (
                      <span className={r.volveriaContratar ? 'text-[#3b6d11]' : 'text-marca-rojo'}>
                        {r.volveriaContratar ? 'Volvería' : 'No volvería'}
                      </span>
                    )}
                    <span className="rounded-full bg-fondo px-2 py-0.5 font-semibold text-texto-fuerte">{r.calificacion}/10</span>
                  </div>
                </div>
                {r.comentario && <p className="mt-0.5 text-texto-suave">“{r.comentario}”</p>}
                <p className="mt-0.5 text-[11px] text-texto-suave">{r.fecha}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Seccion>
  );
}
