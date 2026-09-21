'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useModoPerfil } from '@/lib/modo-perfil';
import { inicioSemana, diasDeSemana, sumarSemanas, etiquetaSemana } from '@/lib/semana';
import { CalendarioEquipo } from '@/components/calendario/calendario-equipo';
import { AgendaNannie } from '@/components/calendario/agenda-nannie';

/**
 * M1 · Calendario — una sola pantalla, según el perfil:
 *  - Coordinación: calendario del equipo (nannies × días) + riel de decisiones.
 *  - Nannie: su semana como agenda + ofertas + marcar disponibilidad.
 */
export default function CalendarioPage() {
  // Con doble perfil (Jacky), manda el rol efectivo del modo activo.
  const { sesion, rolEfectivo } = useModoPerfil();
  // Semana inicial: la del parámetro ?fecha=YYYY-MM-DD (atajo "por asignar" del
  // dashboard) o la de hoy.
  const [lunes, setLunes] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const f = new URLSearchParams(window.location.search).get('fecha');
      if (f) {
        const [y, m, d] = f.split('-').map(Number);
        if (y && m && d) return inicioSemana(new Date(y, m - 1, d));
      }
    }
    return inicioSemana(new Date());
  });

  const dias = useMemo(() => diasDeSemana(lunes), [lunes]);
  const esNannie = rolEfectivo === 'NANNIE';

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
        <AgendaNannie dias={dias} nannieId={sesion.nannieId ?? undefined} />
      ) : (
        <CalendarioEquipo dias={dias} sesion={sesion} />
      )}
    </div>
  );
}
