'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { type ColoniaCat } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Selector/typeahead de colonia de Toluca. Devuelve el id del catálogo (para el
 * match por km) o texto manual (id vacío) cuando la colonia no está en el catálogo.
 */
export function SelectColonia({
  catalogo,
  coloniaId,
  zona,
  onPick,
  className,
}: {
  catalogo: ColoniaCat[];
  coloniaId: string;
  zona: string;
  onPick: (id: string, label: string) => void;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const sel = catalogo.find((c) => c.id === coloniaId);
  const res = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return catalogo.filter((c) => `${c.colonia} ${c.municipio}`.toLowerCase().includes(t)).slice(0, 12);
  }, [q, catalogo]);
  const qLimpio = q.trim();
  // Ofrecer "usar manual" cuando escribieron algo que no calza EXACTO con el catálogo.
  const hayExacta = res.some((c) => c.colonia.toLowerCase() === qLimpio.toLowerCase());
  // Texto visible cuando está cerrado: la colonia del catálogo, o el texto manual.
  const cerradoLabel = sel ? `${sel.colonia} · ${sel.municipio}` : zona;

  return (
    <div className="relative">
      <input
        value={abierto ? q : cerradoLabel}
        onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
        onFocus={() => { setAbierto(true); setQ(''); }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar o escribir colonia…"
        className={cn(className, 'pr-9')}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-suave" />
      {abierto && (res.length > 0 || qLimpio.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-borde bg-panel shadow-card">
          {res.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onPick(c.id, c.colonia); setAbierto(false); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-fondo"
            >
              <span className="text-texto-fuerte">{c.colonia}</span>
              <span className="text-xs text-texto-suave"> · {c.municipio}</span>
            </button>
          ))}
          {qLimpio.length > 0 && !hayExacta && (
            <button
              type="button"
              onMouseDown={() => { onPick('', qLimpio); setAbierto(false); }}
              className="block w-full border-t border-borde px-3 py-2 text-left text-sm hover:bg-fondo"
            >
              <span className="text-texto-fuerte">Usar «{qLimpio}»</span>
              <span className="text-xs text-texto-suave"> · colonia manual (sin match por km)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
