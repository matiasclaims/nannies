'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  api,
  type Servicio,
  type Disponibilidad,
  type NannieLite,
  type Sesion,
} from '@/lib/api';
import { TIPO_LABEL, ESTADO_SERVICIO, ESTADO_DISPONIBILIDAD } from '@/lib/dominio';
import type { DiaSemana } from '@/lib/semana';
import { cn } from '@/lib/utils';
import { FormMarcarDisponibilidad } from './form-marcar-disponibilidad';

const CERRADOS = ['ACEPTADO', 'COMPLETADO', 'CANCELADO'];

type Modo = 'todas' | 'nannie';

/** Vista de coordinación: panorama del equipo (Todas) o detalle con horas (Por nannie). */
export function CalendarioEquipo({ dias, sesion }: { dias: DiaSemana[]; sesion: Sesion }) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [dispon, setDispon] = useState<Disponibilidad[]>([]);
  const [nannies, setNannies] = useState<NannieLite[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [marcando, setMarcando] = useState(false);
  const [modo, setModo] = useState<Modo>('todas');
  const [nannieSel, setNannieSel] = useState<string>('');

  const desde = dias[0]?.fecha;
  const hasta = dias[dias.length - 1]?.fecha;

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const [s, d, n] = await Promise.all([
        api.listarServicios({ desde, hasta }),
        api.listarDisponibilidad({ desde, hasta }),
        api.listarNannies(),
      ]);
      setServicios(s);
      setDispon(d);
      setNannies(n);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (estado === 'error') {
    return <Aviso texto="No se pudo cargar el calendario. ¿Está arriba la API?" />;
  }

  const enDia = (iso: string, dia: string) => iso.slice(0, 10) === dia;
  const porAsignar = servicios.filter((s) => !s.nannieId && !CERRADOS.includes(s.estado));
  const esperando = servicios.filter((s) => s.nannieId && s.estado === 'OFERTADO');
  const nannieActiva = nannies.find((n) => n.id === nannieSel) ?? nannies[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
      {/* Calendario */}
      <div className="min-w-0 rounded-2xl bg-panel p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-borde p-0.5 text-xs">
            <button
              onClick={() => setModo('todas')}
              className={cn(
                'rounded-lg px-3 py-1 font-medium transition',
                modo === 'todas' ? 'bg-marca-azul text-white' : 'text-texto-suave hover:bg-fondo',
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setModo('nannie')}
              className={cn(
                'rounded-lg px-3 py-1 font-medium transition',
                modo === 'nannie' ? 'bg-marca-azul text-white' : 'text-texto-suave hover:bg-fondo',
              )}
            >
              Por nannie
            </button>
          </div>
          {sesion.nannieId && (
            <button
              onClick={() => setMarcando((v) => !v)}
              className="rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
            >
              {marcando ? 'Cerrar' : 'Marcar mi disponibilidad'}
            </button>
          )}
        </div>

        {marcando && sesion.nannieId && (
          <div className="mb-4 rounded-xl border border-borde p-3">
            <FormMarcarDisponibilidad
              fechaInicial={desde ?? ''}
              onGuardado={async () => {
                setMarcando(false);
                await cargar();
              }}
            />
          </div>
        )}

        {estado === 'cargando' ? (
          <div className="h-40 animate-pulse rounded-xl bg-fondo" />
        ) : nannies.length === 0 ? (
          <p className="text-sm text-texto-suave">Aún no hay nannies registradas.</p>
        ) : modo === 'todas' ? (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[760px] gap-1.5 text-xs"
              style={{ gridTemplateColumns: `108px repeat(${dias.length}, minmax(0, 1fr))` }}
            >
              <div />
              {dias.map((d) => (
                <div
                  key={d.fecha}
                  className={cn(
                    'py-1 text-center capitalize',
                    d.esHoy ? 'font-semibold text-marca-azul' : 'text-texto-suave',
                  )}
                >
                  {d.etiqueta}
                </div>
              ))}
              {nannies.map((n) => (
                <FilaNannie
                  key={n.id}
                  nannie={n}
                  dias={dias}
                  serviciosDia={(dia) =>
                    servicios.filter((s) => s.nannieId === n.id && enDia(s.fecha, dia))
                  }
                  disponDia={(dia) => dispon.filter((x) => x.nannieId === n.id && enDia(x.fecha, dia))}
                />
              ))}
            </div>
            <Leyenda />
          </div>
        ) : nannieActiva ? (
          <>
            <RejillaHoras
              nannie={nannieActiva}
              dias={dias}
              servicios={servicios.filter((s) => s.nannieId === nannieActiva.id)}
              dispon={dispon.filter((x) => x.nannieId === nannieActiva.id)}
            />
            <Leyenda />
          </>
        ) : null}
      </div>

      {/* Columna derecha: selector (por nannie) + decisiones */}
      <div className="space-y-3">
        {modo === 'nannie' && (
          <div className="rounded-2xl bg-panel p-4 shadow-card">
            <h3 className="mb-2 text-sm font-semibold text-texto-fuerte">Ver nannie</h3>
            <div className="flex flex-col gap-1">
              {nannies.map((n) => {
                const activa = n.id === (nannieActiva?.id ?? '');
                return (
                  <button
                    key={n.id}
                    onClick={() => setNannieSel(n.id)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-left text-sm transition',
                      activa
                        ? 'bg-marca-azul/10 font-medium text-marca-azul'
                        : 'text-texto-suave hover:bg-fondo',
                    )}
                  >
                    {n.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-panel p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-texto-fuerte">Requieren tu decisión</h3>
          {porAsignar.length === 0 && esperando.length === 0 ? (
            <p className="text-sm text-texto-suave">Nada pendiente esta semana.</p>
          ) : (
            <div className="space-y-3">
              {porAsignar.map((s) => (
                <TarjetaOfertar key={s.id} servicio={s} nannies={nannies} onHecho={cargar} />
              ))}
              {esperando.map((s) => (
                <TarjetaEsperando
                  key={s.id}
                  servicio={s}
                  nombre={nannies.find((n) => n.id === s.nannieId)?.nombre ?? '—'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Modo "Por nannie": rejilla con horas ----------

const HORA_MIN = 7;
const HORA_MAX = 24;
const HORAS = Array.from({ length: HORA_MAX - HORA_MIN }, (_, i) => HORA_MIN + i);

function filaInicio(hhmm: string): number {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const clamp = Math.max(HORA_MIN, Math.min(HORA_MAX, Number.isNaN(h) ? HORA_MIN : h));
  return clamp - HORA_MIN + 2;
}
function filaFin(hhmm: string): number {
  let h = parseInt(hhmm.slice(0, 2), 10);
  const m = parseInt(hhmm.slice(3, 5), 10) || 0;
  if (Number.isNaN(h)) h = HORA_MIN + 1;
  if (h === 0) h = HORA_MAX; // medianoche = fin del día
  const end = Math.max(HORA_MIN + 1, Math.min(HORA_MAX, m > 0 ? h + 1 : h));
  return end - HORA_MIN + 2;
}

function claseDispon(estado: Disponibilidad['estado']): string {
  if (estado === 'DISPONIBLE') return 'bg-marca-verde/15 text-[#3b6d11]';
  if (estado === 'BLOQUEADO') return 'bg-slate-200 text-slate-500';
  return 'bg-marca-rosa/15 text-marca-rosa';
}

function RejillaHoras({
  nannie,
  dias,
  servicios,
  dispon,
}: {
  nannie: NannieLite;
  dias: DiaSemana[];
  servicios: Servicio[];
  dispon: Disponibilidad[];
}) {
  const filas = HORAS.length;
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-sm font-medium text-texto-fuerte">
        {nannie.nombre}
        {nannie.zonas.length > 0 && (
          <span className="text-texto-suave"> · {nannie.zonas.join(', ')}</span>
        )}
      </p>
      <div
        className="grid min-w-[720px] text-xs"
        style={{
          gridTemplateColumns: `52px repeat(${dias.length}, minmax(0, 1fr))`,
          gridTemplateRows: `28px repeat(${filas}, 38px)`,
        }}
      >
        <div style={{ gridColumn: 1, gridRow: 1 }} />
        {dias.map((d, i) => (
          <div
            key={d.fecha}
            style={{ gridColumn: i + 2, gridRow: 1 }}
            className={cn(
              'text-center text-[11px] capitalize',
              d.esHoy ? 'font-semibold text-marca-azul' : 'text-texto-suave',
            )}
          >
            {d.etiqueta}
          </div>
        ))}

        {HORAS.map((h, i) => (
          <div
            key={h}
            style={{ gridColumn: 1, gridRow: i + 2 }}
            className="pr-1.5 text-right text-[11px] text-texto-suave"
          >
            {String(h).padStart(2, '0')}:00
          </div>
        ))}

        {dias.map((d, i) => (
          <div
            key={'bg' + d.fecha}
            style={{
              gridColumn: i + 2,
              gridRow: `2 / ${filas + 2}`,
              backgroundImage:
                'repeating-linear-gradient(to bottom, #f7f9fc, #f7f9fc 37px, #e6edf5 37px, #e6edf5 38px)',
            }}
            className="mx-px rounded"
          />
        ))}

        {dias.map((d, i) => {
          const col = i + 2;
          const disp = dispon.filter((x) => x.fecha.slice(0, 10) === d.fecha);
          const servs = servicios.filter((s) => s.fecha.slice(0, 10) === d.fecha);
          return (
            <Fragment key={'bl' + d.fecha}>
              {disp.map((b) => (
                <div
                  key={b.id}
                  style={{
                    gridColumn: col,
                    gridRow: `${filaInicio(b.horaInicio)} / ${filaFin(b.horaFin)}`,
                    zIndex: 1,
                  }}
                  className={cn(
                    'm-px overflow-hidden rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight',
                    claseDispon(b.estado),
                  )}
                >
                  {ESTADO_DISPONIBILIDAD[b.estado].label}
                </div>
              ))}
              {servs.map((s) => (
                <div
                  key={s.id}
                  style={{
                    gridColumn: col,
                    gridRow: `${filaInicio(s.horaInicio)} / ${filaFin(s.horaFin)}`,
                    zIndex: 2,
                  }}
                  className={cn(
                    'mx-1 my-px overflow-hidden rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight',
                    ESTADO_SERVICIO[s.estado].clase,
                  )}
                >
                  {TIPO_LABEL[s.tipoServicio]}
                  <br />
                  <span className="font-normal">
                    {s.horaInicio}–{s.horaFin}
                  </span>
                </div>
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Modo "Todas": fila por nannie ----------

function FilaNannie({
  nannie,
  dias,
  serviciosDia,
  disponDia,
}: {
  nannie: NannieLite;
  dias: DiaSemana[];
  serviciosDia: (dia: string) => Servicio[];
  disponDia: (dia: string) => Disponibilidad[];
}) {
  return (
    <>
      <div className="flex items-center gap-2 py-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-azul/10 text-[10px] font-semibold text-marca-azul">
          {nannie.nombre.slice(0, 2).toUpperCase()}
        </span>
        <span className="truncate text-texto-fuerte">{nannie.nombre}</span>
      </div>
      {dias.map((d) => {
        const servs = serviciosDia(d.fecha);
        const bloques = disponDia(d.fecha);
        const tint = tinteDisponibilidad(bloques);
        return (
          <div key={d.fecha} className={cn('min-h-[92px] rounded-lg p-1.5', tint)}>
            {servs.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'mb-1 rounded px-1.5 py-1 text-[11px] font-medium leading-tight',
                  ESTADO_SERVICIO[s.estado].clase,
                )}
              >
                {TIPO_LABEL[s.tipoServicio]}
                <br />
                <span className="font-normal">
                  {s.horaInicio}–{s.horaFin}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function TarjetaOfertar({
  servicio,
  nannies,
  onHecho,
}: {
  servicio: Servicio;
  nannies: NannieLite[];
  onHecho: () => Promise<void>;
}) {
  const [nannieId, setNannieId] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function ofertar() {
    if (!nannieId) return;
    setEnviando(true);
    try {
      await api.ofertar(servicio.id, nannieId);
      await onHecho();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-borde p-2.5">
      <p className="text-xs font-semibold text-texto-fuerte">
        {TIPO_LABEL[servicio.tipoServicio]} · {fechaCorta(servicio.fecha)}
      </p>
      <p className="mb-2 text-[11px] text-texto-suave">
        {servicio.horaInicio}–{servicio.horaFin} · {servicio.zona}
      </p>
      <div className="flex gap-1.5">
        <select
          value={nannieId}
          onChange={(e) => setNannieId(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-borde bg-white px-2 py-1 text-xs outline-none focus:border-marca-azul"
        >
          <option value="">Elegir nannie…</option>
          {nannies.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={ofertar}
          disabled={!nannieId || enviando}
          className="shrink-0 rounded-lg bg-marca-azul px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Ofertar
        </button>
      </div>
    </div>
  );
}

function TarjetaEsperando({ servicio, nombre }: { servicio: Servicio; nombre: string }) {
  return (
    <div className="rounded-xl border border-borde p-2.5">
      <p className="text-xs font-semibold text-texto-fuerte">
        {TIPO_LABEL[servicio.tipoServicio]} · {fechaCorta(servicio.fecha)}
      </p>
      <p className="mb-1.5 text-[11px] text-texto-suave">
        Ofertado a <span className="font-medium">{nombre}</span>
      </p>
      <span className="inline-block rounded-full bg-marca-morado/15 px-2 py-0.5 text-[10px] font-medium text-marca-morado">
        Esperando su respuesta
      </span>
    </div>
  );
}

function tinteDisponibilidad(bloques: Disponibilidad[]): string {
  if (bloques.some((b) => b.estado === 'DISPONIBLE')) return 'bg-marca-verde/10';
  if (bloques.some((b) => b.estado === 'BLOQUEADO')) return 'bg-slate-100';
  if (bloques.some((b) => b.estado === 'TEMPORAL')) return 'bg-marca-rosa/10';
  return '';
}

function Leyenda() {
  const items = [
    { c: 'bg-marca-verde/20', t: 'Disponible' },
    { c: 'bg-slate-200', t: 'Bloqueado' },
    { c: 'bg-marca-azul/15', t: 'Asignado' },
    { c: 'bg-marca-morado/15', t: 'Ofertado' },
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-texto-suave">
      {items.map((i) => (
        <span key={i.t} className="flex items-center gap-1.5">
          <span className={cn('inline-block h-2.5 w-2.5 rounded-sm', i.c)} />
          {i.t}
        </span>
      ))}
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
