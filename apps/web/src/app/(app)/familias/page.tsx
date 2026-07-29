'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import {
  api,
  type FamiliaLite,
  type NannieLite,
  type PaqueteActivo,
  type Plaza,
  type TipoServicio,
} from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { HoraSelect } from '@/components/hora-select';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

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

export default function FamiliasPage() {
  const [familias, setFamilias] = useState<FamiliaLite[]>([]);
  const [nannies, setNannies] = useState<NannieLite[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [alta, setAlta] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setFamilias(await api.listarFamilias());
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    void cargar();
    api.listarNannies().then(setNannies).catch(() => undefined);
  }, [cargar]);

  if (estado === 'error') {
    return <Aviso texto="No se pudieron cargar las familias. ¿Está arriba la API?" />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-texto-fuerte">Familias</h1>
          <p className="text-sm text-texto-suave">
            Cardex de familias y su paquete de horas activo.
          </p>
        </div>
        <button
          onClick={() => setAlta((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-marca-azul px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <UserPlus className="h-4 w-4" />
          {alta ? 'Cerrar' : 'Nueva familia'}
        </button>
      </div>

      {alta && <AltaFamilia onCreada={() => { setAlta(false); void cargar(); }} />}

      {estado === 'cargando' ? (
        <div className="h-32 animate-pulse rounded-2xl bg-panel" />
      ) : familias.length === 0 ? (
        <Aviso texto="Aún no hay familias. Crea la primera con “Nueva familia”." />
      ) : (
        <ul className="space-y-2">
          {familias.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-panel p-4 shadow-card"
            >
              <div className="min-w-0">
                <Link
                  href={`/familias/${f.id}`}
                  className="text-sm font-semibold text-texto-fuerte hover:text-marca-azul hover:underline"
                >
                  {f.nombreContacto}
                </Link>
                <p className="text-xs text-texto-suave">
                  {f.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'}
                  {f.zona ? ` · ${f.zona}` : ''} · {f.nServicios ?? 0} servicios
                  {f.ultimaAtencion ? ` · última ${fechaCortaFam(f.ultimaAtencion)}` : ''}
                </p>
              </div>
              <PaqueteCelda familia={f} nannies={nannies} onCambio={cargar} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Muestra el saldo del paquete activo, o el control para registrar uno. */
function PaqueteCelda({
  familia,
  nannies,
  onCambio,
}: {
  familia: FamiliaLite;
  nannies: NannieLite[];
  onCambio: () => Promise<void>;
}) {
  const [horas, setHoras] = useState(30);
  const [manual, setManual] = useState(false);
  const [programando, setProgramando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const p = familia.paqueteActivo;
  if (p) {
    const pct = Math.round((p.horasConsumidas / p.horasTotales) * 100);
    return (
      <div className="w-64 shrink-0">
        <div className="mb-1 flex items-center justify-between text-xs">
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
        <a
          href={`/proyeccion/${p.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-[11px] font-medium text-marca-azul hover:underline"
        >
          Ver proyección (PDF)
        </a>
        {p.asignacionManual ? (
          <p className="mt-1.5 text-[11px] text-texto-suave">
            Asignación manual: agrega sus sesiones desde Asignación conforme las pidan.
          </p>
        ) : p.horasRestantes > 0 ? (
          <>
            <button
              onClick={() => setProgramando((v) => !v)}
              className="mt-2 w-full rounded-lg border border-marca-azul px-2 py-1 text-xs font-semibold text-marca-azul hover:bg-marca-azul/5"
            >
              {programando ? 'Cerrar' : 'Programar sesiones'}
            </button>
            {programando && (
              <ProgramarPaquete
                paquete={p}
                familia={familia}
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
      await api.crearPaquete(familia.id, horas, manual);
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="w-64 shrink-0">
      <div className="flex gap-2">
        <select
          value={horas}
          onChange={(e) => setHoras(Number(e.target.value))}
          className={cn(inputCls, 'flex-1')}
        >
          {TRAMOS.map((h) => (
            <option key={h} value={h}>
              {h} horas
            </option>
          ))}
        </select>
        <button
          onClick={registrar}
          disabled={guardando}
          className="shrink-0 rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? '…' : 'Registrar'}
        </button>
      </div>
      <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-texto-suave">
        <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
        Asignación manual (la familia no dio fechas)
      </label>
      {error && <p className="mt-1 text-xs text-marca-rojo">{error}</p>}
    </div>
  );
}

/** Programación masiva de un paquete: patrón semanal → todas las sesiones. */
function ProgramarPaquete({
  paquete,
  familia,
  nannies,
  onHecho,
}: {
  paquete: PaqueteActivo;
  familia: FamiliaLite;
  nannies: NannieLite[];
  onHecho: () => Promise<void>;
}) {
  const [dias, setDias] = useState<number[]>([1, 3, 5]);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [fechaInicio, setFechaInicio] = useState('');
  const [tipo, setTipo] = useState<TipoServicio>('DAYCARE');
  const [numNinos, setNumNinos] = useState(1);
  const [zona, setZona] = useState(familia.zona ?? '');
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
        Se programaron <strong>{resultado.creados}</strong> sesiones ({resultado.horasConsumidas} h).
        Aparecen como ofertas en el calendario.
        <button
          onClick={onHecho}
          className="mt-2 w-full rounded-lg bg-marca-azul py-1 text-xs font-semibold text-white"
        >
          Listo
        </button>
      </div>
    );
  }

  const chico = 'rounded-lg border border-borde bg-white px-2 py-1 text-xs outline-none focus:border-marca-azul';
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-borde bg-fondo p-2.5 text-xs">
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
                dias.includes(d.n) ? 'bg-marca-azul text-white' : 'bg-white text-texto-suave border border-borde',
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
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
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
            <option key={n.id} value={n.id}>{n.nombre}</option>
          ))}
        </select>
      </label>
      {error && <p className="text-marca-rojo">{error}</p>}
      <button
        onClick={programar}
        disabled={busy}
        className="w-full rounded-lg bg-marca-azul py-1.5 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Programando…' : `Programar (quedan ${paquete.horasRestantes} h)`}
      </button>
    </div>
  );
}

function AltaFamilia({ onCreada }: { onCreada: () => void }) {
  const [nombre, setNombre] = useState('');
  const [plaza, setPlaza] = useState<Plaza>('TOLUCA');
  const [zona, setZona] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await api.crearFamilia({ nombreContacto: nombre, plaza, zona: zona || undefined });
      onCreada();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <p className="mb-2 text-sm font-semibold text-texto-fuerte">Nueva familia</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de contacto"
          className={inputCls}
        />
        <select value={plaza} onChange={(e) => setPlaza(e.target.value as Plaza)} className={inputCls}>
          <option value="TOLUCA">Toluca</option>
          <option value="QUERETARO">Querétaro</option>
        </select>
        <input
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="Zona"
          className={inputCls}
        />
      </div>
      <button
        onClick={guardar}
        disabled={guardando || !nombre.trim()}
        className="mt-2 rounded-lg bg-marca-azul px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {guardando ? 'Guardando…' : 'Guardar familia'}
      </button>
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

function fechaCortaFam(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
