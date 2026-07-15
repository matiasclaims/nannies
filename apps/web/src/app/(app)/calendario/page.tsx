'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type Sesion } from '@/lib/api';
import { inicioSemana, diasDeSemana, sumarSemanas, etiquetaSemana } from '@/lib/semana';
import { CalendarioEquipo } from '@/components/calendario/calendario-equipo';
import { AgendaNannie } from '@/components/calendario/agenda-nannie';

/**
 * M1 · Calendario — una sola pantalla, según el perfil:
 *  - Coordinación: calendario del equipo (nannies × días) + riel de decisiones.
 *  - Nannie: su semana como agenda + ofertas + marcar disponibilidad.
 */
export default function CalendarioPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [lunes, setLunes] = useState<Date>(() => inicioSemana(new Date()));

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  const dias = useMemo(() => diasDeSemana(lunes), [lunes]);
  const esNannie = sesion?.rol === 'NANNIE';

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-texto-fuerte">Calendario</h1>
          <p className="text-sm text-texto-suave">
            {esNannie ? 'Tu semana, ofertas y disponibilidad' : 'Disponibilidad y asignaciones del equipo'}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-panel p-1 shadow-card">
          <button
            onClick={() => setLunes(sumarSemanas(lunes, -1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-texto-suave hover:bg-fondo"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-40 text-center text-sm font-medium text-texto-fuerte">
            {etiquetaSemana(lunes)}
          </span>
          <button
            onClick={() => setLunes(sumarSemanas(lunes, 1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-texto-suave hover:bg-fondo"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {sesion === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel shadow-card" />
      ) : esNannie ? (
        <AgendaNannie dias={dias} />
      ) : (
        <CalendarioEquipo dias={dias} sesion={sesion} />
      )}
    </div>
  );
}
