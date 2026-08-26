'use client';

import { useState } from 'react';
import { api, type PaqueteActivo, type NannieLite, type TipoServicio } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { HoraSelect } from '@/components/hora-select';
import { cn } from '@/lib/utils';

const TRAMOS = [10, 20, 30, 40, 50];
const DIAS = [
  { n: 0, t: 'D' },
  { n: 1, t: 'L' },
  { n: 2, t: 'M' },
  { n: 3, t: 'X' },
  { n: 4, t: 'J' },
  { n: 5, t: 'V' },
  { n: 6, t: 'S' },
];
const inputCls = 'rounded-lg border border-borde bg-white px-3 py-1.5 text-sm outline-none focus:border-marca-azul';

/** M5/M2 · Control completo del paquete de horas de una familia (vive DENTRO del
 *  expediente de la familia). Muestra el saldo del paquete activo con sus
 *  acciones, o el control para registrar uno. */
export function PaqueteFamilia({
  familiaId,
  zona,
  paquete,
  nannies,
  onCambio,
}: {
  familiaId: string;
  zona: string | null;
  paquete: PaqueteActivo | null;
  nannies: NannieLite[];
  onCambio: () => Promise<void> | void;
}) {
  const [horas, setHoras] = useState(30);
  const [manual, setManual] = useState(false);
  const [programando, setProgramando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState('');

  if (paquete) {
    const p = paquete;
    const pct = Math.round((p.horasConsumidas / p.horasTotales) * 100);
    const copiarEnlace = async () => {
      try {
        const { token } = await api.enlaceAvance(p.id);
        await navigator.clipboard.writeText(`${window.location.origin}/avance/${token}`);
        setCopiado('¡Enlace copiado! Compártelo con la familia.');
      } catch {
        setCopiado('No se pudo copiar el enlace.');
      }
      setTimeout(() => setCopiado(''), 3000);
    };
    return (
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-texto-fuerte">
            Paquete activo
            {p.asignacionManual && (
              <span className="ml-1 rounded-full bg-marca-morado/15 px-1.5 py-0.5 text-[10px] font-semibold text-marca-morado">
                manual
              </span>
            )}
          </span>
          <span className="text-texto-suave">
            {p.horasRestantes} / {p.horasTotales} h
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-fondo">
          <div className="h-full rounded-full bg-marca-verde" style={{ width: `${100 - pct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <a href={`/proyeccion/${p.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-marca-azul hover:underline">
            Ver proyección (PDF)
          </a>
          <button onClick={copiarEnlace} className="font-medium text-marca-azul hover:underline">
            Copiar enlace de avance
          </button>
        </div>
        {copiado && <p className="mt-1 text-xs text-[#3b6d11]">{copiado}</p>}
        {p.asignacionManual ? (
          <p className="mt-1.5 text-xs text-texto-suave">
            Asignación manual: agrega sus sesiones desde Asignación conforme las pidan.
          </p>
        ) : p.horasRestantes > 0 ? (
          <>
            <button
              onClick={() => setProgramando((v) => !v)}
              className="mt-2 rounded-lg border border-marca-azul px-3 py-1 text-xs font-semibold text-marca-azul hover:bg-marca-azul/5"
            >
              {programando ? 'Cerrar' : 'Programar sesiones'}
            </button>
            {programando && (
              <ProgramarPaquete
                paquete={p}
                zonaDefault={zona}
                nannies={nannies}
                onHecho={async () => {
                  setProgramando(false);
                  await onCambio();
                }}
              />
            )}
          </>
        ) : null}
      </div>
    );
  }

  async function registrar() {
    setError('');
    setGuardando(true);
    try {
      await api.crearPaquete(familiaId, horas, manual);
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs text-texto-suave">Esta familia no tiene un paquete de horas activo. Regístrale uno:</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={horas} onChange={(e) => setHoras(Number(e.target.value))} className={inputCls}>
          {TRAMOS.map((h) => (
            <option key={h} value={h}>
              {h} horas
            </option>
          ))}
        </select>
        <button
          onClick={registrar}
          disabled={guardando}
          className="rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? '…' : 'Registrar paquete'}
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-texto-suave">
          <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
          Asignación manual (la familia no dio fechas)
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-marca-rojo">{error}</p>}
    </div>
  );
}

/** Programación masiva de un paquete: patrón semanal → todas las sesiones. */
function ProgramarPaquete({
  paquete,
  zonaDefault,
  nannies,
  onHecho,
}: {
  paquete: PaqueteActivo;
  zonaDefault: string | null;
  nannies: NannieLite[];
  onHecho: () => Promise<void>;
}) {
  const [dias, setDias] = useState<number[]>([1, 3, 5]);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [fechaInicio, setFechaInicio] = useState('');
  const [tipo, setTipo] = useState<TipoServicio>('DAYCARE');
  const [numNinos, setNumNinos] = useState(1);
  const [zona, setZona] = useState(zonaDefault ?? '');
  const [nannieId, setNannieId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ creados: number; horasConsumidas: number } | null>(null);

  function toggleDia(n: number) {
    setDias((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]));
  }

  async function programar() {
    setError('');
    if (!dias.length) return setError('Elige al menos un día.');
    if (!fechaInicio) return setError('Elige la fecha de inicio.');
    if (!zona.trim()) return setError('Indica la zona.');
    setBusy(true);
    try {
      const r = await api.programarPaquete({
        paqueteId: paquete.id,
        diasSemana: dias,
        horaInicio,
        horaFin,
        fechaInicio,
        tipoServicio: tipo,
        numNinos,
        zona,
        nannieId: nannieId || undefined,
      });
      setResultado({ creados: r.creados, horasConsumidas: r.horasConsumidas });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo programar.');
    } finally {
      setBusy(false);
    }
  }

  if (resultado) {
    return (
      <div className="mt-2 rounded-lg bg-marca-verde/10 p-2.5 text-xs text-[#3b6d11]">
        Se programaron <strong>{resultado.creados}</strong> sesiones ({resultado.horasConsumidas} h). Aparecen como
        ofertas en el calendario.
        <button onClick={onHecho} className="mt-2 w-full rounded-lg bg-marca-azul py-1 text-xs font-semibold text-white">
          Listo
        </button>
      </div>
    );
  }

  const chico = 'rounded-lg border border-borde bg-white px-2 py-1 text-xs outline-none focus:border-marca-azul';
  return (
    <div className="mt-2 max-w-md space-y-2 rounded-lg border border-borde bg-fondo p-2.5 text-xs">
      <div>
        <p className="mb-1 text-texto-suave">Días</p>
        <div className="flex gap-1">
          {DIAS.map((d) => (
            <button
              key={d.n}
              type="button"
              onClick={() => toggleDia(d.n)}
              className={cn(
                'h-6 w-6 rounded-full text-[11px] font-semibold',
                dias.includes(d.n) ? 'bg-marca-azul text-white' : 'border border-borde bg-white text-texto-suave',
              )}
            >
              {d.t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <label className="flex-1">
          <span className="mb-0.5 block text-texto-suave">Desde</span>
          <HoraSelect value={horaInicio} onChange={setHoraInicio} className={cn(chico, 'w-full')} />
        </label>
        <label className="flex-1">
          <span className="mb-0.5 block text-texto-suave">Hasta</span>
          <HoraSelect value={horaFin} onChange={setHoraFin} className={cn(chico, 'w-full')} />
        </label>
      </div>
      <label className="block">
        <span className="mb-0.5 block text-texto-suave">Desde la fecha</span>
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={cn(chico, 'w-full')} />
      </label>
      <div className="flex gap-1.5">
        <label className="flex-1">
          <span className="mb-0.5 block text-texto-suave">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoServicio)} className={cn(chico, 'w-full')}>
            {(Object.keys(TIPO_LABEL) as TipoServicio[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="w-14">
          <span className="mb-0.5 block text-texto-suave">Niños</span>
          <input type="number" min={1} max={8} value={numNinos} onChange={(e) => setNumNinos(Number(e.target.value))} className={cn(chico, 'w-full')} />
        </label>
      </div>
      <label className="block">
        <span className="mb-0.5 block text-texto-suave">Zona</span>
        <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Ej. Metepec" className={cn(chico, 'w-full')} />
      </label>
      <label className="block">
        <span className="mb-0.5 block text-texto-suave">Nannie (opcional)</span>
        <select value={nannieId} onChange={(e) => setNannieId(e.target.value)} className={cn(chico, 'w-full')}>
          <option value="">Sin asignar (por asignar)</option>
          {nannies.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-marca-rojo">{error}</p>}
      <button onClick={programar} disabled={busy} className="w-full rounded-lg bg-marca-azul py-1.5 font-semibold text-white disabled:opacity-50">
        {busy ? 'Programando…' : `Programar (quedan ${paquete.horasRestantes} h)`}
      </button>
    </div>
  );
}
