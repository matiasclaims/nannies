'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, MapPin } from 'lucide-react';
import { api, ApiError, type ColoniaCat, type ColoniaDias } from '@/lib/api';
import { EditorColonias } from '@/components/editor-colonias';

export default function MisColoniasPage() {
  const [catalogo, setCatalogo] = useState<ColoniaCat[]>([]);
  const [colonias, setColonias] = useState<ColoniaDias[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'prohibido' | 'error'>('cargando');

  const cargar = useCallback(() => {
    Promise.all([api.misColonias(), api.catalogoColonias()])
      .then(([mias, cat]) => {
        setColonias(mias.colonias);
        setCatalogo(cat);
        setEstado('ok');
      })
      .catch((e) => setEstado(e instanceof ApiError && e.status === 403 ? 'prohibido' : 'error'));
  }, []);
  useEffect(cargar, [cargar]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-texto-fuerte">
          <MapPin className="h-5 w-5 text-marca-azul" /> Mis colonias de trabajo
        </h1>
        <p className="text-sm text-texto-suave">
          Estas son las colonias y días donde puedes recibir servicios (a 4 km a la redonda). Las define tu coordinación.
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
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Tus colonias las administra tu coordinación (Paula o Jackie). Si necesitas un cambio, pídeselo.</span>
          </div>

          {colonias.length === 0 ? (
            <p className="py-4 text-center text-sm text-texto-suave">
              Aún no tienes colonias asignadas. Tu coordinación las configurará.
            </p>
          ) : (
            <EditorColonias colonias={colonias} catalogo={catalogo} onChange={setColonias} readOnly />
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
