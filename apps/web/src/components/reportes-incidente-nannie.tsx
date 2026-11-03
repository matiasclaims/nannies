'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { api, type IncidenteResumen } from '@/lib/api';

const fechaHoraCorta = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Reportes de incidente donde participó la nannie (solo lectura, coordinación).
 *  Se crean/editan desde la ficha de la familia; aquí quedan registrados. */
export function ReportesIncidenteNannie({ nannieId }: { nannieId: string }) {
  const [lista, setLista] = useState<IncidenteResumen[] | null>(null);

  useEffect(() => {
    api.incidentesDeNannie(nannieId).then(setLista).catch(() => setLista([]));
  }, [nannieId]);

  return (
    <div className="rounded-2xl bg-panel p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-texto-fuerte">
        <AlertTriangle className="h-4 w-4 text-marca-azul" /> Reportes de incidente
      </h2>

      {lista == null ? (
        <div className="h-10 animate-pulse rounded-lg bg-fondo" />
      ) : lista.length === 0 ? (
        <p className="text-xs text-texto-suave">Sin reportes de incidente registrados para esta nannie.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-borde p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-texto-fuerte">
                  {r.menor}
                  {r.coberturaAplico && (
                    <span className="ml-2 rounded-full bg-marca-azul/10 px-2 py-0.5 text-[10px] font-semibold text-marca-azul">
                      Cobertura aplicada
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-texto-suave">
                  {fechaHoraCorta(r.fechaHoraIncidente)}
                  {r.familia ? ` · Familia: ${r.familia}` : ''}
                </p>
                {r.diagnostico && <p className="mt-0.5 truncate text-xs text-texto-suave">Dx: {r.diagnostico}</p>}
              </div>
              <a
                href={`/reporte-incidente/${r.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-borde px-2 py-1 text-[11px] font-medium text-texto-suave hover:bg-fondo"
                title="Ver / imprimir PDF"
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
