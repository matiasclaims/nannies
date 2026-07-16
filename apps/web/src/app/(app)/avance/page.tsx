import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * VENTANA PROVISIONAL — Avance del proyecto (para que Paula vea el progreso).
 * Cronograma visual (Gantt) basado en el Plan de Proyecto PLAN-NANNIES-006.
 * El `progreso` de cada fase se actualiza a mano conforme avanzamos.
 * Se retira al entregar el sistema.
 *
 * Eje de tiempo: días desde el 1 jul 2026 (0) al 31 oct 2026 (123).
 */

interface Fase {
  clave: string;
  nombre: string;
  entrega: string;
  ini: number; // día desde 1 jul
  fin: number;
  progreso: number; // 0-100
}

const AXIS = 123;
const pct = (d: number) => (d / AXIS) * 100;
const HOY = 15; // 16 jul 2026

const MESES = [
  { n: 'Julio', a: 0, b: 31 },
  { n: 'Agosto', a: 31, b: 62 },
  { n: 'Septiembre', a: 62, b: 92 },
  { n: 'Octubre', a: 92, b: 123 },
];

const FASES: Fase[] = [
  { clave: 'Fase 0', nombre: 'Kickoff y levantamiento', entrega: '10 jul', ini: 5, fin: 9, progreso: 100 },
  { clave: 'Fase 1', nombre: 'Diseño visual', entrega: '24 jul', ini: 12, fin: 23, progreso: 100 },
  { clave: 'Fase 2', nombre: 'Arquitectura', entrega: '7 ago', ini: 26, fin: 37, progreso: 100 },
  { clave: 'Fase 3', nombre: 'Núcleo (M1–M3)', entrega: '4 sep', ini: 40, fin: 65, progreso: 34 },
  { clave: 'Fase 4', nombre: 'Gestión (M4–M6)', entrega: '25 sep', ini: 68, fin: 86, progreso: 0 },
  { clave: 'Fase 5', nombre: 'Dashboard 360 (M7)', entrega: '2 oct', ini: 89, fin: 93, progreso: 0 },
  { clave: 'Fase 6', nombre: 'Pruebas y liberación', entrega: '16 oct', ini: 96, fin: 107, progreso: 0 },
];

const HITOS = [
  { clave: 'H1', nombre: 'Diseño visual aprobado', fecha: '24 jul 2026', hecho: true },
  { clave: 'H2', nombre: 'Núcleo funcionando', fecha: '4 sep 2026', hecho: false },
  { clave: 'H3', nombre: 'Gestión completa', fecha: '25 sep 2026', hecho: false },
  { clave: 'H4', nombre: 'Sistema completo', fecha: '2 oct 2026', hecho: false },
  { clave: 'H5', nombre: 'Liberación a producción', fecha: '16 oct 2026', hecho: false },
];

function Barra({ f }: { f: Fase }) {
  const left = `${pct(f.ini)}%`;
  const width = `${pct(f.fin - f.ini)}%`;
  const base = 'absolute top-1/2 h-5 -translate-y-1/2 rounded-md shadow-sm';
  if (f.progreso >= 100) {
    return <div className={cn(base, 'bg-marca-verde')} style={{ left, width }} title={f.nombre} />;
  }
  if (f.progreso > 0) {
    return (
      <div className={cn(base, 'overflow-hidden bg-marca-azul/25')} style={{ left, width }} title={f.nombre}>
        <div className="h-full rounded-md bg-marca-azul" style={{ width: `${f.progreso}%` }} />
      </div>
    );
  }
  return <div className={cn(base, 'bg-slate-200')} style={{ left, width }} title={f.nombre} />;
}

export default function AvancePage() {
  const overall = Math.round(FASES.reduce((s, f) => s + f.progreso, 0) / FASES.length);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-texto-fuerte">Avance del proyecto</h1>
        <p className="text-sm text-texto-suave">
          Sistema Operativo Nannies · Arranque 6 jul 2026 · Liberación tentativa 16 oct 2026
        </p>
      </div>

      {/* Progreso general */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <div className="mb-2 flex items-end justify-between">
          <span className="text-sm font-medium text-texto-fuerte">Progreso general</span>
          <span className="text-2xl font-bold text-marca-azul">{overall}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-fondo">
          <div
            className="h-full rounded-full bg-gradient-to-r from-marca-azul to-marca-morado transition-all"
            style={{ width: `${overall}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-texto-suave">
          Diseño, arquitectura y M1 completos — vamos adelantados respecto al cronograma.
        </p>
      </div>

      {/* Cronograma visual (Gantt) */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-texto-fuerte">Cronograma</h2>
          <div className="flex flex-wrap gap-3 text-[11px] text-texto-suave">
            <Leyenda color="bg-marca-verde" t="Completado" />
            <Leyenda color="bg-marca-azul" t="En progreso" />
            <Leyenda color="bg-slate-200" t="Pendiente" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="flex">
              {/* Etiquetas de fase */}
              <div className="w-44 shrink-0">
                <div className="h-6" />
                {FASES.map((f) => (
                  <div key={f.clave} className="flex h-9 items-center pr-3 text-xs">
                    <span className="truncate">
                      <span className="font-semibold text-texto-fuerte">{f.clave}</span>
                      <span className="text-texto-suave"> · {f.nombre}</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Línea de tiempo */}
              <div className="relative flex-1">
                {/* Encabezado de meses */}
                <div className="relative h-6">
                  {MESES.map((m) => (
                    <div
                      key={m.n}
                      className="absolute top-0 truncate text-center text-[11px] font-medium text-texto-suave"
                      style={{ left: `${pct(m.a)}%`, width: `${pct(m.b - m.a)}%` }}
                    >
                      {m.n}
                    </div>
                  ))}
                </div>

                {/* Barras + líneas de mes + HOY */}
                <div className="relative">
                  {MESES.slice(1).map((m) => (
                    <div
                      key={m.n}
                      className="absolute bottom-0 top-0 w-px bg-borde"
                      style={{ left: `${pct(m.a)}%` }}
                    />
                  ))}

                  {/* Línea de HOY */}
                  <div
                    className="absolute bottom-0 top-0 z-10 w-0.5 bg-marca-rojo"
                    style={{ left: `${pct(HOY)}%` }}
                  >
                    <span className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-marca-rojo px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      HOY
                    </span>
                  </div>

                  {FASES.map((f) => (
                    <div key={f.clave} className="relative h-9">
                      <Barra f={f} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hitos de validación */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-texto-fuerte">
          Hitos de validación con la Dirección
        </h2>
        <ul className="space-y-2">
          {HITOS.map((h) => (
            <li key={h.clave} className="flex items-center gap-3 text-sm">
              {h.hecho ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-marca-verde" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-texto-suave/40" />
              )}
              <span className="text-[11px] font-semibold text-texto-suave">{h.clave}</span>
              <span className="flex-1 text-texto-fuerte">{h.nombre}</span>
              <span className="text-xs text-texto-suave">{h.fecha}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-texto-suave">
        Vista provisional de seguimiento · basada en el Plan de Proyecto PLAN-NANNIES-006.
      </p>
    </div>
  );
}

function Leyenda({ color, t }: { color: string; t: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('inline-block h-2.5 w-4 rounded-sm', color)} />
      {t}
    </span>
  );
}
