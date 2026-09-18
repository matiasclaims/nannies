'use client';

import { useState } from 'react';
import { api, type PaqueteActivo, type NannieLite, type TipoServicio } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { HoraSelect } from '@/components/hora-select';
import { cn } from '@/lib/utils';

const TRAMOS = [10, 20, 30, 40, 50];
const inputCls = 'rounded-lg border border-borde bg-white px-3 py-1.5 text-sm outline-none focus:border-marca-azul';

/** Horas entre dos "HH:mm" (fin − inicio). */
function horasEntre(hi: string, hf: string): number {
  const min = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  return (min(hf) - min(hi)) / 60;
}

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
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState('');

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
    // Solo se puede eliminar un paquete SIN horas consumidas / servicios (el
    // backend lo valida; aquí se deshabilita si ya se usó, con el porqué).
    const puedeBorrar = p.horasConsumidas === 0;
    const eliminar = async () => {
      setErrorBorrar('');
      setBorrando(true);
      try {
        await api.eliminarPaquete(p.id);
        await onCambio();
      } catch (e) {
        setErrorBorrar(e instanceof Error ? e.message : 'No se pudo eliminar el paquete.');
        setBorrando(false);
        setConfirmBorrar(false);
      }
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

        {/* Eliminar paquete: solo si no tiene horas asignadas / servicios otorgados. */}
        <div className="mt-2 text-xs">
          {!confirmBorrar ? (
            <button
              onClick={() => { setErrorBorrar(''); setConfirmBorrar(true); }}
              disabled={!puedeBorrar}
              title={puedeBorrar ? 'Eliminar este paquete' : 'No se puede eliminar: el paquete ya tiene horas asignadas o servicios otorgados.'}
              className="font-medium text-marca-rojo hover:underline disabled:cursor-not-allowed disabled:text-texto-suave disabled:no-underline"
            >
              Eliminar paquete
            </button>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="text-texto-fuerte">¿Eliminar el paquete?</span>
              <button onClick={eliminar} disabled={borrando} className="rounded bg-marca-rojo px-2 py-0.5 font-semibold text-white disabled:opacity-50">
                {borrando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setConfirmBorrar(false)} className="text-texto-suave hover:underline">
                Cancelar
              </button>
            </span>
          )}
          {errorBorrar && <p className="mt-1 text-marca-rojo">{errorBorrar}</p>}
        </div>

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

/** Programación masiva de un paquete: eliges varias fechas en el calendario y se
 *  crea una sesión por cada una, todas con la misma nannie y el mismo horario. */
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
  const hoy = new Date();
  const [verMes, setVerMes] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });
  const [fechas, setFechas] = useState<string[]>([]);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [tipo, setTipo] = useState<TipoServicio>('DAYCARE');
  const [numNinos, setNumNinos] = useState(1);
  const [zona, setZona] = useState(zonaDefault ?? '');
  const [nannieId, setNannieId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ creados: number; horasConsumidas: number; omitidas: string[] } | null>(null);

  const dur = horasEntre(horaInicio, horaFin);
  const horasPedidas = fechas.length * dur;
  const excede = horasPedidas > paquete.horasRestantes;

  function toggleFecha(iso: string) {
    setFechas((f) => (f.includes(iso) ? f.filter((x) => x !== iso) : [...f, iso]));
  }

  async function programar() {
    setError('');
    if (!fechas.length) return setError('Elige al menos una fecha en el calendario.');
    if (!zona.trim()) return setError('Indica la zona.');
    if (excede) return setError(`Las fechas suman ${horasPedidas} h y solo quedan ${paquete.horasRestantes} h.`);
    setBusy(true);
    try {
      const r = await api.programarPaquete({
        paqueteId: paquete.id,
        fechas: [...fechas].sort(),
        horaInicio,
        horaFin,
        tipoServicio: tipo,
        numNinos,
        zona,
        nannieId: nannieId || undefined,
      });
      setResultado({ creados: r.creados, horasConsumidas: r.horasConsumidas, omitidas: r.omitidas });
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
        {resultado.omitidas.length > 0 && (
          <p className="mt-1.5 text-marca-rojo">
            Se omitieron {resultado.omitidas.length} fecha{resultado.omitidas.length === 1 ? '' : 's'} porque la nannie
            ya tenía servicio a esa hora: {resultado.omitidas.join(', ')}.
          </p>
        )}
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
        <p className="mb-1 text-texto-suave">Elige los días</p>
        <CalendarioFechas
          y={verMes.y}
          m={verMes.m}
          seleccionadas={fechas}
          onMover={(dy, dm) => setVerMes({ y: dy, m: dm })}
          onToggle={toggleFecha}
        />
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
      <p className={cn('text-texto-suave', excede && 'text-marca-rojo')}>
        {fechas.length} fecha{fechas.length === 1 ? '' : 's'} · {horasPedidas} h de {paquete.horasRestantes} h disponibles
      </p>
      {error && <p className="text-marca-rojo">{error}</p>}
      <button
        onClick={programar}
        disabled={busy || !fechas.length || excede}
        className="w-full rounded-lg bg-marca-azul py-1.5 font-semibold text-white disabled:opacity-50"
      >
        {busy
          ? 'Programando…'
          : fechas.length === 1
            ? 'Programar 1 sesión'
            : `Programar ${fechas.length} sesiones`}
      </button>
    </div>
  );
}

/** Mini-calendario de un mes; permite marcar/desmarcar varias fechas. */
function CalendarioFechas({
  y,
  m,
  seleccionadas,
  onMover,
  onToggle,
}: {
  y: number;
  m: number;
  seleccionadas: string[];
  onMover: (y: number, m: number) => void;
  onToggle: (iso: string) => void;
}) {
  const primerDia = new Date(y, m, 1).getDay(); // 0 = domingo
  const diasEnMes = new Date(y, m + 1, 0).getDate();
  const etiqueta = new Date(y, m, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const mueve = (paso: number) => {
    const d = new Date(y, m + paso, 1);
    onMover(d.getFullYear(), d.getMonth());
  };
  return (
    <div className="rounded-lg border border-borde bg-white p-2">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" onClick={() => mueve(-1)} className="rounded px-2 py-0.5 text-texto-suave hover:bg-fondo">‹</button>
        <span className="text-[11px] font-semibold capitalize text-texto-fuerte">{etiqueta}</span>
        <button type="button" onClick={() => mueve(1)} className="rounded px-2 py-0.5 text-texto-suave hover:bg-fondo">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-texto-suave">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: primerDia }).map((_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const sel = seleccionadas.includes(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onToggle(iso)}
              className={cn(
                'aspect-square rounded text-[11px] font-medium',
                sel ? 'bg-marca-azul text-white' : 'text-texto-fuerte hover:bg-fondo',
              )}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
