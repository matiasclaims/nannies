'use client';

import { useEffect, useState } from 'react';
import { Download, BookOpen } from 'lucide-react';
import { api, type Sesion } from '@/lib/api';
import { MANUAL, type Publico, type Seccion } from '@/lib/manual';
import { cn } from '@/lib/utils';

export default function ManualPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [modIdx, setModIdx] = useState(0);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  const publico: Publico = sesion?.rol === 'NANNIE' ? 'nannie' : 'coordinacion';
  const etiquetaPublico = publico === 'nannie' ? 'Nannie' : 'Coordinación';
  const pdfHref = publico === 'nannie' ? '/manual-nannie.pdf' : '/manual-coordinacion.pdf';
  const cap = MANUAL[modIdx];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-texto-fuerte">Manual de usuario</h1>
          <p className="text-sm text-texto-suave">
            Guía de uso del sistema. Muestra solo lo que corresponde a tu perfil
            {sesion && <> · <span className="font-medium text-texto-fuerte">{etiquetaPublico}</span></>}.
          </p>
        </div>
        {sesion ? (
          <a
            href={pdfHref}
            download
            className="flex items-center gap-2 rounded-xl border border-borde px-3 py-2 text-sm font-medium text-marca-azul transition hover:bg-marca-azul/5"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </a>
        ) : (
          <button
            disabled
            className="flex items-center gap-2 rounded-xl border border-borde px-3 py-2 text-sm text-texto-suave opacity-60"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>
        )}
      </div>

      {sesion === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel shadow-card" />
      ) : (
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          {/* Índice por módulo */}
          <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            <p className="hidden px-1 text-xs font-medium uppercase tracking-wide text-texto-suave md:block">
              Módulos
            </p>
            {MANUAL.map((m, i) => (
              <button
                key={m.modulo}
                onClick={() => setModIdx(i)}
                className={cn(
                  'whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition md:whitespace-normal',
                  i === modIdx
                    ? 'bg-marca-azul/10 font-medium text-marca-azul'
                    : 'text-texto-suave hover:bg-fondo hover:text-texto-fuerte',
                )}
              >
                <span className="font-semibold">{m.modulo}</span> · {m.nombre}
              </button>
            ))}
          </nav>

          {/* Capítulo del módulo seleccionado */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca-azul/10 text-marca-azul">
                <BookOpen className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-texto-fuerte">
                {cap.modulo} · {cap.nombre}
              </h2>
            </div>

            {cap.contenido[publico].map((sec) => (
              <SeccionCard key={sec.titulo} sec={sec} />
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-texto-suave">
        El manual crece con el sistema: al cerrar cada módulo se agrega su capítulo.
      </p>
    </div>
  );
}

function SeccionCard({ sec }: { sec: Seccion }) {
  return (
    <div className="rounded-2xl bg-panel p-5 shadow-card">
      <h3 className="text-sm font-semibold text-texto-fuerte">{sec.titulo}</h3>
      {sec.intro && <p className="mt-1 text-sm text-texto-suave">{sec.intro}</p>}
      {sec.pasos && (
        <ol className="mt-3 space-y-2">
          {sec.pasos.map((paso, i) => (
            <li key={i} className="flex gap-3 text-sm text-texto-fuerte">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-marca-azul/10 text-[11px] font-semibold text-marca-azul">
                {i + 1}
              </span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
      )}
      {sec.nota && (
        <p className="mt-3 rounded-xl bg-fondo px-3 py-2 text-xs text-texto-suave">{sec.nota}</p>
      )}
    </div>
  );
}
