'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, MapPin } from 'lucide-react';
import { api, ApiError, type ColoniaCat, type ColoniaDias } from '@/lib/api';
import { EditorColonias } from '@/components/editor-colonias';

export default function MisColoniasPage() {
  const [catalogo, setCatalogo] = useState<ColoniaCat[]>([]);
  const [colonias, setColonias] = useState<ColoniaDias[]>([]);
  const [bloqueadas, setBloqueadas] = useState(false);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'prohibido' | 'error'>('cargando');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const cargar = useCallback(() => {
    Promise.all([api.misColonias(), api.catalogoColonias()])
      .then(([mias, cat]) => {
        setColonias(mias.colonias);
        setBloqueadas(mias.bloqueadas);
        setCatalogo(cat);
        setEstado('ok');
      })
      .catch((e) => setEstado(e instanceof ApiError && e.status === 403 ? 'prohibido' : 'error'));
  }, []);
  useEffect(cargar, [cargar]);

  async function guardar(confirmar: boolean) {
    if (confirmar && !window.confirm('Al confirmar, ya no podrás cambiar tus colonias por tu cuenta (un cambio lo autoriza tu coordinación). ¿Continuar?')) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await api.guardarMisColonias(colonias.map((c) => ({ coloniaId: c.coloniaId, dias: c.dias })), confirmar);
      setBloqueadas(r.bloqueadas);
      setMsg(confirmar ? 'Colonias confirmadas.' : 'Guardado.');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-texto-fuerte">
          <MapPin className="h-5 w-5 text-marca-azul" /> Mis colonias de trabajo
        </h1>
        <p className="text-sm text-texto-suave">
          Elige las colonias donde puedes dar servicio y los días de cada una. Los servicios se te asignan cuando estás a 4 km a la redonda.
        </p>
      </div>

      {estado === 'prohibido' ? (
        <Aviso texto="Esta sección es para las nannies." />
      ) : estado === 'error' ? (
        <Aviso texto="No se pudo cargar. Intenta de nuevo." />
      ) : estado === 'cargando' ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel" />
      ) : (
        <div className="rounded-2xl bg-panel p-5 shadow-card">
          {bloqueadas && (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Tus colonias están confirmadas. Para cambiarlas, pídelo a tu coordinación (Paula o Jackie).</span>
            </div>
          )}

          <EditorColonias colonias={colonias} catalogo={catalogo} onChange={setColonias} readOnly={bloqueadas} />

          {!bloqueadas && (
            <div className="mt-4 flex items-center justify-end gap-2">
              {msg && <span className="text-xs text-texto-suave">{msg}</span>}
              <button onClick={() => guardar(false)} disabled={busy} className="rounded-lg border border-borde px-4 py-1.5 text-sm font-medium text-texto-suave hover:bg-fondo disabled:opacity-50">
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
              <button onClick={() => guardar(true)} disabled={busy || colonias.length === 0} className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                Confirmar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}
