'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Lock } from 'lucide-react';
import { api, ApiError, type ColoniaCat, type ColoniaDias } from '@/lib/api';
import { Seccion } from '@/components/seccion';
import { EditorColonias } from '@/components/editor-colonias';

/** M5 · Colonias de trabajo de la nannie, vista de coordinación (editar + candado). */
export function ColoniasNannie({ nannieId }: { nannieId: string }) {
  const [catalogo, setCatalogo] = useState<ColoniaCat[]>([]);
  const [colonias, setColonias] = useState<ColoniaDias[]>([]);
  const [bloqueadas, setBloqueadas] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const cargar = useCallback(() => {
    Promise.all([api.coloniasDeNannie(nannieId), api.catalogoColonias()])
      .then(([data, cat]) => {
        setColonias(data.colonias);
        setBloqueadas(data.bloqueadas);
        setCatalogo(cat);
      })
      .catch(() => undefined);
  }, [nannieId]);
  useEffect(cargar, [cargar]);

  async function guardar() {
    setBusy(true);
    setMsg('');
    try {
      await api.guardarColoniasDeNannie(nannieId, colonias.map((c) => ({ coloniaId: c.coloniaId, dias: c.dias })), bloqueadas);
      setMsg('Guardado.');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Seccion icon={MapPin} title="Colonias de trabajo" subtitle="Toluca · por día (match a 4 km)" tint="azul" defaultOpen={false}>
      <EditorColonias colonias={colonias} catalogo={catalogo} onChange={setColonias} />

      <label className="mt-3 flex items-center gap-2 text-sm text-texto-fuerte">
        <input type="checkbox" checked={bloqueadas} onChange={(e) => setBloqueadas(e.target.checked)} className="h-4 w-4" />
        <Lock className="h-3.5 w-3.5 text-texto-suave" />
        Bloqueadas para la nannie (no las puede cambiar sola)
      </label>

      <div className="mt-3 flex items-center justify-end gap-2">
        {msg && <span className="text-xs text-texto-suave">{msg}</span>}
        <button onClick={guardar} disabled={busy} className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Seccion>
  );
}
