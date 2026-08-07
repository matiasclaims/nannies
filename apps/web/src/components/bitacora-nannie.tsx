'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, type NotaNannie } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Bitácora de coordinación por nannie (M4): notas libres que SOLO ven Paula y
 *  Jackie. No son incidencias; sirven para la asignación (química, etc.). */
export function BitacoraNannie({ nannieId }: { nannieId: string }) {
  const [notas, setNotas] = useState<NotaNannie[] | null>(null);
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(() => {
    api.notasNannie(nannieId).then(setNotas).catch(() => setNotas([]));
  }, [nannieId]);
  useEffect(cargar, [cargar]);

  async function agregar() {
    if (!texto.trim()) return;
    setBusy(true);
    await api.agregarNotaNannie(nannieId, texto.trim()).catch(() => undefined);
    setTexto('');
    setBusy(false);
    cargar();
  }
  async function borrar(id: string) {
    await api.borrarNotaNannie(id).catch(() => undefined);
    cargar();
  }

  const input = 'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texto-fuerte">Bitácora</h2>
        <span className="text-[10px] text-texto-suave">Solo tú y Jackie</span>
      </div>
      <p className="mb-3 text-[11px] text-texto-suave">
        Notas de coordinación (química con familias, cancelaciones justificadas…). No penalizan.
      </p>

      <div className="flex items-start gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          className={cn(input, 'resize-none')}
          placeholder="Ej. No hizo química con la familia de Amelie."
        />
        <button
          onClick={agregar}
          disabled={busy || !texto.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-marca-azul px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar
        </button>
      </div>

      {notas && notas.length > 0 && (
        <div className="mt-3 divide-y divide-borde">
          {notas.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-2 py-2 text-xs">
              <div className="min-w-0">
                <p className="text-texto-fuerte">{n.texto}</p>
                <p className="text-[11px] text-texto-suave">
                  {n.autor} · {fechaCorta(n.fecha)}
                </p>
              </div>
              <button
                onClick={() => borrar(n.id)}
                className="shrink-0 text-texto-suave hover:text-marca-rojo"
                aria-label="Borrar nota"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
