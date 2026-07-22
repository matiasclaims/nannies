'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Search, CheckCircle2 } from 'lucide-react';
import {
  api,
  type FamiliaLite,
  type NannieLite,
  type Candidata,
  type Plaza,
  type TipoServicio,
} from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

const RANGO_LABEL: Record<string, string> = {
  BASE: 'Base',
  ROOKIE: 'Rookie',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
};

interface Form {
  familiaId: string;
  plaza: Plaza;
  zona: string;
  tipoServicio: TipoServicio;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  numNinos: number;
}

/** Describe el hueco de una coincidencia aproximada en lenguaje llano. */
function descHueco(c: Candidata): string {
  const h = (min: number) => (min % 60 === 0 ? `${min / 60} h` : `${min} min`);
  const partes: string[] = [];
  if (c.faltaInicioMin > 0) partes.push(`empieza ${h(c.faltaInicioMin)} tarde`);
  if (c.faltaFinMin > 0) partes.push(`termina ${h(c.faltaFinMin)} antes`);
  return partes.join(' y ');
}

function calcDuracion(ini: string, fin: string): number | null {
  const [ih, im] = ini.split(':').map(Number);
  const [fh, fm] = fin.split(':').map(Number);
  const mins = fh * 60 + fm - (ih * 60 + im);
  if (mins <= 0 || mins % 60 !== 0) return null; // solo horas completas
  return mins / 60;
}

export default function AsignacionPage() {
  const [familias, setFamilias] = useState<FamiliaLite[]>([]);
  const [nannies, setNannies] = useState<NannieLite[]>([]);
  const [form, setForm] = useState<Form>({
    familiaId: '',
    plaza: 'TOLUCA',
    zona: '',
    tipoServicio: 'DAYCARE',
    fecha: '',
    horaInicio: '09:00',
    horaFin: '13:00',
    numNinos: 1,
  });
  const [candidatas, setCandidatas] = useState<Candidata[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [overrideId, setOverrideId] = useState('');
  const [cobrarAPaquete, setCobrarAPaquete] = useState(true);

  const cargarFamilias = () => api.listarFamilias().then(setFamilias).catch(() => undefined);

  useEffect(() => {
    void cargarFamilias();
    api.listarNannies().then(setNannies).catch(() => undefined);
  }, []);

  const duracion = useMemo(
    () => calcDuracion(form.horaInicio, form.horaFin),
    [form.horaInicio, form.horaFin],
  );

  const familiaSel = familias.find((f) => f.id === form.familiaId);
  const paquete = familiaSel?.paqueteActivo ?? null;
  const usaPaquete = paquete !== null && cobrarAPaquete;
  const excedePaquete =
    usaPaquete && paquete !== null && duracion !== null ? duracion > paquete.horasRestantes : false;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setCandidatas(null);
    setExito('');
  }

  function elegirFamilia(id: string) {
    const fam = familias.find((f) => f.id === id);
    setForm((f) => ({ ...f, familiaId: id, plaza: fam?.plaza ?? f.plaza, zona: fam?.zona ?? f.zona }));
    setCobrarAPaquete(true); // por defecto, cobrar al paquete si la familia tiene uno
    setCandidatas(null);
    setExito('');
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setExito('');
    if (!form.familiaId) return setError('Elige una familia.');
    if (!form.zona.trim()) return setError('Indica la zona del servicio.');
    if (duracion === null || duracion < 3)
      return setError('El horario debe ser en horas completas y de mínimo 3 horas.');
    setBuscando(true);
    try {
      const { candidatas } = await api.recomendar({
        plaza: form.plaza,
        zona: form.zona,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        tipoServicio: form.tipoServicio,
      });
      setCandidatas(candidatas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recomendar.');
    } finally {
      setBuscando(false);
    }
  }

  async function ofertar(nannieId: string) {
    if (!nannieId || duracion === null) return;
    setError('');
    setAsignando(true);
    try {
      await api.asignar({
        familiaId: form.familiaId,
        plaza: form.plaza,
        zona: form.zona,
        tipoServicio: form.tipoServicio,
        formato: usaPaquete ? 'PAQUETE' : 'INDIVIDUAL',
        paqueteId: usaPaquete && paquete ? paquete.id : undefined,
        numNinos: form.numNinos,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        duracionHoras: duracion,
        nannieId,
      });
      const nombre =
        nannies.find((n) => n.id === nannieId)?.nombre ??
        candidatas?.find((c) => c.nannieId === nannieId)?.nombre ??
        'la nannie';
      setExito(
        `Servicio ofertado a ${nombre}. Queda pendiente de su respuesta.` +
          (usaPaquete && duracion ? ` Se descontaron ${duracion} h del paquete.` : ''),
      );
      setCandidatas(null);
      setOverrideId('');
      await cargarFamilias(); // refresca el saldo del paquete
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar.');
    } finally {
      setAsignando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-texto-fuerte">Asignación</h1>
        <p className="text-sm text-texto-suave">
          Captura un servicio y el sistema recomienda nannies según zona y disponibilidad.
        </p>
      </div>

      {exito && (
        <div className="flex items-center gap-2 rounded-2xl bg-marca-verde/15 p-4 text-sm text-[#3b6d11]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {exito}
        </div>
      )}

      {/* Nuevo servicio */}
      <form onSubmit={buscar} className="space-y-3 rounded-2xl bg-panel p-5 shadow-card">
        <h2 className="text-sm font-semibold text-texto-fuerte">Nuevo servicio</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Familia">
            <div className="relative flex gap-2">
              <select
                value={form.familiaId}
                onChange={(e) => elegirFamilia(e.target.value)}
                className={inputCls}
              >
                <option value="">Elegir familia…</option>
                {familias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombreContacto}
                  </option>
                ))}
              </select>
              <AltaFamilia
                onCreada={(f) => {
                  setFamilias((prev) => [...prev, f]);
                  elegirFamilia(f.id);
                }}
              />
            </div>
          </Campo>

          <Campo label="Tipo de servicio">
            <select
              value={form.tipoServicio}
              onChange={(e) => set('tipoServicio', e.target.value as TipoServicio)}
              className={inputCls}
            >
              {(Object.keys(TIPO_LABEL) as TipoServicio[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Plaza">
            <select
              value={form.plaza}
              onChange={(e) => set('plaza', e.target.value as Plaza)}
              className={inputCls}
            >
              <option value="TOLUCA">Toluca</option>
              <option value="QUERETARO">Querétaro</option>
            </select>
          </Campo>

          <Campo label="Zona">
            <input
              value={form.zona}
              onChange={(e) => set('zona', e.target.value)}
              className={inputCls}
              placeholder="Ej. Metepec"
            />
          </Campo>

          <Campo label="Fecha">
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              className={inputCls}
            />
          </Campo>

          <Campo label="Nº de niños">
            <input
              type="number"
              min={1}
              max={8}
              value={form.numNinos}
              onChange={(e) => set('numNinos', Number(e.target.value))}
              className={inputCls}
            />
          </Campo>

          <Campo label="Desde">
            <input
              type="time"
              value={form.horaInicio}
              onChange={(e) => set('horaInicio', e.target.value)}
              className={inputCls}
            />
          </Campo>

          <Campo label="Hasta">
            <input
              type="time"
              value={form.horaFin}
              onChange={(e) => set('horaFin', e.target.value)}
              className={inputCls}
            />
          </Campo>
        </div>

        <p className="text-xs text-texto-suave">
          Duración:{' '}
          {duracion === null ? (
            <span className="text-marca-rojo">horas completas, mínimo 3</span>
          ) : (
            `${duracion} h`
          )}
        </p>

        {/* Cobro: paquete de horas (si la familia tiene uno activo) o suelto */}
        {paquete && (
          <div className="rounded-xl border border-borde bg-fondo p-3">
            <p className="mb-2 text-xs font-medium text-texto-suave">Cobro del servicio</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label
                className={cn(
                  'flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs',
                  cobrarAPaquete ? 'border-marca-azul bg-marca-azul/5' : 'border-borde',
                )}
              >
                <input
                  type="radio"
                  name="cobro"
                  checked={cobrarAPaquete}
                  onChange={() => setCobrarAPaquete(true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-texto-fuerte">Descontar del paquete</span>
                  <br />
                  Quedan <strong>{paquete.horasRestantes} h</strong> de {paquete.horasTotales} h
                </span>
              </label>
              <label
                className={cn(
                  'flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs',
                  !cobrarAPaquete ? 'border-marca-azul bg-marca-azul/5' : 'border-borde',
                )}
              >
                <input
                  type="radio"
                  name="cobro"
                  checked={!cobrarAPaquete}
                  onChange={() => setCobrarAPaquete(false)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-texto-fuerte">Servicio suelto</span>
                  <br />
                  Fuera del paquete (se cobra en Finanzas)
                </span>
              </label>
            </div>
            {excedePaquete && (
              <p className="mt-2 text-xs text-marca-rojo">
                El servicio ({duracion} h) excede el saldo del paquete ({paquete.horasRestantes} h).
                Reduce el horario, renueva el paquete o cóbralo como servicio suelto.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-marca-rojo">{error}</p>}

        <button
          type="submit"
          disabled={buscando}
          className="flex items-center gap-2 rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {buscando ? 'Buscando…' : 'Buscar nannies disponibles'}
        </button>
      </form>

      {/* Recomendación */}
      {candidatas !== null && (
        <div className="space-y-3 rounded-2xl bg-panel p-5 shadow-card">
          <h2 className="text-sm font-semibold text-texto-fuerte">
            Recomendación ({candidatas.length})
          </h2>

          {candidatas.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Ninguna nannie cumple zona + disponibilidad para ese horario. Puedes ofertar de todos
              modos a alguien más abajo (override).
            </p>
          ) : (
            <ul className="space-y-2">
              {candidatas.map((c, i) => (
                <li
                  key={c.nannieId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde p-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-texto-fuerte">
                      {i === 0 && !c.aproximada && (
                        <span className="rounded-full bg-marca-azul/15 px-2 py-0.5 text-[10px] font-semibold text-marca-azul">
                          Sugerida
                        </span>
                      )}
                      {c.aproximada && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Aproximada
                        </span>
                      )}
                      {c.nombre}
                    </p>
                    <p className="text-xs text-texto-suave">
                      Disponible {c.bloque} · {RANGO_LABEL[c.rango]} · {c.serviciosSemana} servicios
                      esta semana · {c.zonas.join(', ')}
                    </p>
                    {c.aproximada && (
                      <p className="text-xs text-amber-700">No cubre exacto: {descHueco(c)}.</p>
                    )}
                  </div>
                  <button
                    onClick={() => ofertar(c.nannieId)}
                    disabled={asignando || excedePaquete}
                    className="shrink-0 rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Ofertar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Override */}
          <div className="rounded-xl bg-fondo p-3">
            <p className="mb-2 text-xs font-medium text-texto-suave">
              Asignar a otra nannie (override) — fuera de la recomendación:
            </p>
            <div className="flex gap-2">
              <select
                value={overrideId}
                onChange={(e) => setOverrideId(e.target.value)}
                className={cn(inputCls, 'flex-1')}
              >
                <option value="">Elegir nannie…</option>
                {nannies.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre} · {n.zonas.join(', ')}
                  </option>
                ))}
              </select>
              <button
                onClick={() => ofertar(overrideId)}
                disabled={!overrideId || asignando || excedePaquete}
                className="shrink-0 rounded-lg border border-marca-azul px-3 py-1.5 text-xs font-semibold text-marca-azul disabled:opacity-50"
              >
                Ofertar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-texto-suave">{label}</span>
      {children}
    </label>
  );
}

function AltaFamilia({ onCreada }: { onCreada: (f: FamiliaLite) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [plaza, setPlaza] = useState<Plaza>('TOLUCA');
  const [zona, setZona] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      const f = await api.crearFamilia({ nombreContacto: nombre, plaza, zona: zona || undefined });
      onCreada(f);
      setAbierto(false);
      setNombre('');
      setZona('');
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Nueva familia"
        className="grid h-[38px] w-10 shrink-0 place-items-center rounded-xl border border-borde text-marca-azul hover:bg-fondo"
      >
        <UserPlus className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="absolute right-0 top-11 z-20 w-64 rounded-xl border border-borde bg-panel p-3 shadow-card">
      <p className="mb-2 text-xs font-medium text-texto-fuerte">Nueva familia</p>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de contacto"
        className={cn(inputCls, 'mb-2')}
      />
      <div className="mb-2 flex gap-2">
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !nombre.trim()}
          className="flex-1 rounded-lg bg-marca-azul py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-borde px-3 py-1.5 text-xs text-texto-suave"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
