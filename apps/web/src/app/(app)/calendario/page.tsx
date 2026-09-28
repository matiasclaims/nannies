'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useModoPerfil } from '@/lib/modo-perfil';
import {
  inicioSemana,
  diasDeSemana,
  sumarSemanas,
  etiquetaSemana,
  inicioMes,
  diasDeMes,
  sumarMeses,
  etiquetaMes,
} from '@/lib/semana';
import { cn } from '@/lib/utils';
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
  // Mes de referencia para la vista mensual (solo la nannie puede alternar).
  const [mesRef, setMesRef] = useState<Date>(() => inicioMes(new Date()));
  // Vista de la nannie: 'semana' (por defecto) o 'mes'.
  const [vista, setVista] = useState<'semana' | 'mes'>('semana');

  const esNannie = rolEfectivo === 'NANNIE';
  const vistaMes = esNannie && vista === 'mes';

  const dias = useMemo(
    () => (vistaMes ? diasDeMes(mesRef) : diasDeSemana(lunes)),
    [vistaMes, mesRef, lunes],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-texto-fuerte">Calendario</h1>
          <p className="text-sm text-texto-suave">
            {esNannie ? 'Tu agenda, ofertas y disponibilidad' : 'Disponibilidad y asignaciones del equipo'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternar semana / mes (solo la nannie). */}
          {esNannie && (
            <div className="flex items-center gap-1 rounded-xl bg-panel p-1 shadow-card">
              {(['semana', 'mes'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition',
                    vista === v ? 'bg-marca-azul text-white' : 'text-texto-suave hover:bg-fondo',
                  )}
                >
                  {v === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-panel p-1 shadow-card">
            <button
              onClick={() => (vistaMes ? setMesRef(sumarMeses(mesRef, -1)) : setLunes(sumarSemanas(lunes, -1)))}
              className="grid h-8 w-8 place-items-center rounded-lg text-texto-suave hover:bg-fondo"
              aria-label={vistaMes ? 'Mes anterior' : 'Semana anterior'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-40 text-center text-sm font-medium capitalize text-texto-fuerte">
              {vistaMes ? etiquetaMes(mesRef) : etiquetaSemana(lunes)}
            </span>
            <button
              onClick={() => (vistaMes ? setMesRef(sumarMeses(mesRef, 1)) : setLunes(sumarSemanas(lunes, 1)))}
              className="grid h-8 w-8 place-items-center rounded-lg text-texto-suave hover:bg-fondo"
              aria-label={vistaMes ? 'Mes siguiente' : 'Semana siguiente'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {sesion === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel shadow-card" />
      ) : esNannie ? (
        <AgendaNannie dias={dias} vista={vista} nannieId={sesion.nannieId ?? undefined} />
      ) : (
        <CalendarioEquipo dias={dias} sesion={sesion} />
      )}
    </div>
  );
}
