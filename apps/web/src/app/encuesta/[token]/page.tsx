'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { api, type EncuestaPublica } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';

/** Encuesta de evaluación para la FAMILIA (M6 · 6.2, sin login, por token). */
export default function EncuestaPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<EncuestaPublica | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [calificacion, setCalificacion] = useState<number | null>(null);
  const [volveria, setVolveria] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .encuestaPublica(token)
      .then((d) => {
        setData(d);
        setEstado('ok');
        if (d.respondido) setEnviado(true);
      })
      .catch(() => setEstado('error'));
  }, [token]);

  async function enviar() {
    if (calificacion == null || volveria == null) {
      setError('Elige una calificación y si volverías a contratar.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await api.responderEncuesta(token, { calificacion, volveriaContratar: volveria, comentario: comentario.trim() || undefined });
      setEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar. Intenta de nuevo.');
      setEnviando(false);
    }
  }

  if (estado === 'error') {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-texto-suave">Esta encuesta no es válida o ya no está disponible.</p>
      </div>
    );
  }
  if (!data) return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;

  return (
    <div className="mx-auto max-w-md space-y-4 p-5">
      <header className="flex items-center gap-3 border-b border-borde pb-4">
        <Image src="/nannies-logo.png" alt="Nannies" width={100} height={40} className="h-10 w-auto" />
        <div>
          <h1 className="text-base font-bold text-[#17323b]">¿Cómo estuvo el servicio?</h1>
          <p className="text-xs text-texto-suave">
            {TIPO_LABEL[data.tipoServicio]} · {fechaLarga(data.fecha)}
            {data.nannie ? ` · con ${data.nannie}` : ''}
          </p>
        </div>
      </header>

      {enviado ? (
        <div className="rounded-2xl bg-panel p-6 text-center shadow-card">
          <p className="text-sm font-semibold text-texto-fuerte">¡Gracias por tu opinión! 🙌</p>
          <p className="mt-1 text-xs text-texto-suave">Tu respuesta nos ayuda a mejorar el servicio.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-panel p-5 shadow-card">
            <p className="mb-2 text-sm font-medium text-texto-fuerte">Del 1 al 10, ¿cómo calificas el servicio?</p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCalificacion(n)}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${
                    calificacion === n ? 'border-marca-azul bg-marca-azul text-white' : 'border-borde text-texto-fuerte hover:bg-fondo'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-panel p-5 shadow-card">
            <p className="mb-2 text-sm font-medium text-texto-fuerte">¿Nos volverías a contratar?</p>
            <div className="flex gap-3">
              {[
                { v: true, t: 'Sí' },
                { v: false, t: 'No' },
              ].map((o) => (
                <button
                  key={o.t}
                  type="button"
                  onClick={() => setVolveria(o.v)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                    volveria === o.v ? 'border-marca-azul bg-marca-azul/10 text-marca-azul' : 'border-borde text-texto-fuerte hover:bg-fondo'
                  }`}
                >
                  {o.t}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-panel p-5 shadow-card">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-texto-fuerte">¿Algo que quieras contarnos?</span>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-borde bg-panel px-3 py-2 text-sm"
                placeholder="Opcional — sobre todo si algo no salió bien"
              />
            </label>
          </div>

          {error && <p className="text-center text-xs text-marca-rojo">{error}</p>}
          <button
            onClick={enviar}
            disabled={enviando}
            className="w-full rounded-xl bg-marca-azul px-4 py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      )}

      <p className="pt-2 text-center text-[11px] text-texto-suave">Nannies Child Care</p>
    </div>
  );
}

function fechaLarga(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}
