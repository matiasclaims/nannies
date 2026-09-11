'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { api, type HistorialEvalCoord, type TipoServicio } from '@/lib/api';
import { Seccion } from '@/components/seccion';
import { TIPO_LABEL } from '@/lib/dominio';

/** M4 (Paula 2026-09-03) · Historial de evaluaciones POR SERVICIO de la nannie
 *  (solo lectura). Las evaluaciones se registran en la bandeja de pendientes. */
export function EvaluacionCoordNannie({ nannieId }: { nannieId: string }) {
  const [hist, setHist] = useState<HistorialEvalCoord[] | null>(null);

  useEffect(() => {
    api.evalCoordHistorial(nannieId).then(setHist).catch(() => setHist([]));
  }, [nannieId]);

  const prom =
    hist && hist.length ? Math.round((hist.reduce((s, e) => s + e.calificacion, 0) / hist.length) * 10) / 10 : null;
  const subtitle = prom != null ? `Promedio: ${prom.toFixed(1)}/10 · ${hist!.length} evaluaciones` : 'Sin evaluaciones aún';

  return (
    <Seccion icon={Star} title="Evaluación (por servicio)" tint="ambar" subtitle={subtitle} defaultOpen={false}>
      <div className="mb-3 flex justify-end">
        <Link href="/evaluaciones" className="rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95">
          Ir a evaluaciones pendientes
        </Link>
      </div>

      {hist === null ? (
        <p className="py-4 text-center text-sm text-texto-suave">Cargando…</p>
      ) : hist.length === 0 ? (
        <p className="py-4 text-center text-sm text-texto-suave">
          Aún no tiene evaluaciones por servicio. Se registran desde la bandeja de pendientes.
        </p>
      ) : (
        <div className="divide-y divide-borde">
          {hist.map((e) => (
            <div key={e.id} className="flex items-start gap-3 py-2 text-sm">
              <span className="w-12 shrink-0 text-center">
                <span className="block text-base font-bold text-texto-fuerte">{e.calificacion.toFixed(1)}</span>
                <span className="block text-[10px] text-texto-suave">/10</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-texto-fuerte">
                  {e.familia}
                  <span className="ml-1 text-xs font-normal text-texto-suave">
                    · {e.tipo === 'PAQUETE' ? e.detalle : TIPO_LABEL[e.detalle as TipoServicio] ?? e.detalle}
                  </span>
                </span>
                <span className="block text-xs text-texto-suave">
                  {e.fecha} · {e.evaluadaPor}
                  {e.nota ? ` — ${e.nota}` : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Seccion>
  );
}
