'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ColoniaCat, ColoniaDias } from '@/lib/api';
import { cn } from '@/lib/utils';

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // 0=dom … 6=sáb

/** Editor de colonias de trabajo con sus días. Controlado. */
export function EditorColonias({
  colonias,
  catalogo,
  onChange,
  readOnly = false,
}: {
  colonias: ColoniaDias[];
  catalogo: ColoniaCat[];
  onChange: (c: ColoniaDias[]) => void;
  readOnly?: boolean;
}) {
  const [busca, setBusca] = useState('');
  const yaPuestas = useMemo(() => new Set(colonias.map((c) => c.coloniaId)), [colonias]);

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    return catalogo
      .filter((c) => !yaPuestas.has(c.id) && (`${c.colonia} ${c.municipio}`).toLowerCase().includes(q))
      .slice(0, 12);
  }, [busca, catalogo, yaPuestas]);

  function agregar(c: ColoniaCat) {
    onChange([...colonias, { coloniaId: c.id, municipio: c.municipio, colonia: c.colonia, dias: [1, 2, 3, 4, 5] }]);
    setBusca('');
  }
  function quitar(id: string) {
    onChange(colonias.filter((c) => c.coloniaId !== id));
  }
  function toggleDia(id: string, d: number) {
    onChange(
      colonias.map((c) =>
        c.coloniaId === id
          ? { ...c, dias: c.dias.includes(d) ? c.dias.filter((x) => x !== d) : [...c.dias, d].sort() }
          : c,
      ),
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="relative">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar colonia o municipio para agregar…"
            className="w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul"
          />
          {resultados.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-borde bg-panel shadow-card">
              {resultados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => agregar(c)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-fondo"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-marca-azul" />
                  <span className="text-texto-fuerte">{c.colonia}</span>
                  <span className="text-xs text-texto-suave">· {c.municipio}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {colonias.length === 0 ? (
        <p className="text-xs text-texto-suave">Aún no hay colonias{readOnly ? '' : '. Búscalas arriba y agrégalas'}.</p>
      ) : (
        <div className="space-y-2">
          {colonias.map((c) => (
            <div key={c.coloniaId} className="rounded-xl border border-borde p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-texto-fuerte">{c.colonia}</p>
                  <p className="text-[11px] text-texto-suave">{c.municipio}</p>
                </div>
                {!readOnly && (
                  <button onClick={() => quitar(c.coloniaId)} className="shrink-0 text-texto-suave hover:text-marca-rojo" title="Quitar">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {DIAS.map((d, i) => {
                  const on = c.dias.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleDia(c.coloniaId, i)}
                      className={cn(
                        'grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold transition',
                        on ? 'bg-marca-azul text-white' : 'border border-borde text-texto-suave',
                        !readOnly && 'hover:brightness-95',
                        readOnly && 'cursor-default',
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
