'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type Servicio,
  type Disponibilidad,
  type NannieLite,
  type Sesion,
} from '@/lib/api';
import { TIPO_LABEL, ESTADO_DISPONIBILIDAD } from '@/lib/dominio';
import type { DiaSemana } from '@/lib/semana';
import { cn } from '@/lib/utils';
import { FormMarcarDisponibilidad } from './form-marcar-disponibilidad';

const CERRADOS = ['ACEPTADO', 'COMPLETADO', 'CANCELADO'];
type Modo = 'todas' | 'nannie';

// Rejilla de horas
const HORA_MIN = 7;
const HORA_MAX = 24;
const HORAS = Array.from({ length: HORA_MAX - HORA_MIN }, (_, i) => HORA_MIN + i);
const ROW = 40; // px por hora
const HEADER = 28; // px del encabezado de día

interface Bloque {
  id: string;
  ini: string;
  fin: string;
  clase: string;
  etiqueta: string;
}

// Colores estilo Google Calendar (ver dominio.ts).
const CLASE_DISPONIBLE = 'bg-amber-100 border border-amber-300 text-amber-800';
const CLASE_BLOQUEADO = 'bg-slate-200 border border-slate-300 text-slate-600';
function claseServicio(estado: Servicio['estado']): string {
  if (estado === 'OFERTADO') return 'bg-marca-azul/20 border border-marca-azul/40 text-marca-azul';
  if (estado === 'ACEPTADO' || estado === 'COMPLETADO')
    return 'bg-marca-rojo/20 border border-marca-rojo/50 text-[#a3312f]';
  return 'bg-slate-200 border border-slate-300 text-slate-500';
}

/** Vista de coordinación: rejilla de horas del equipo (Todas) o de una nannie. */
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
  const primerNombre = (id: string) =>
    (nannies.find((n) => n.id === id)?.nombre ?? 'Nannie').split(' ')[0];
  const porAsignar = servicios.filter((s) => !s.nannieId && !CERRADOS.includes(s.estado));
  const esperando = servicios.filter((s) => s.nannieId && s.estado === 'OFERTADO');
  const nannieActiva = nannies.find((n) => n.id === nannieSel) ?? nannies[0];

  // "Todas": solo disponibilidad + servicios asignados (SIN bloqueos), con el nombre.
  const bloquesTodas = (dia: string): Bloque[] => {
    const disp = dispon
      .filter((x) => x.estado === 'DISPONIBLE' && enDia(x.fecha, dia))
      .map<Bloque>((x) => ({
        id: 'd' + x.id,
        ini: x.horaInicio,
        fin: x.horaFin,
        clase: CLASE_DISPONIBLE,
        etiqueta: primerNombre(x.nannieId),
      }));
    const servs = servicios
      .filter((s) => s.nannieId && (s.estado === 'OFERTADO' || s.estado === 'ACEPTADO') && enDia(s.fecha, dia))
      .map<Bloque>((s) => ({
        id: 's' + s.id,
        ini: s.horaInicio,
        fin: s.horaFin,
        clase: claseServicio(s.estado),
        etiqueta: `${primerNombre(s.nannieId!)} · ${TIPO_LABEL[s.tipoServicio]}`,
      }));
    return [...disp, ...servs];
  };

  // "Por nannie": todo lo de esa nannie (incluye bloqueos).
  const bloquesNannie = (dia: string): Bloque[] => {
    if (!nannieActiva) return [];
    const disp = dispon
      .filter((x) => x.nannieId === nannieActiva.id && enDia(x.fecha, dia))
      .map<Bloque>((x) => ({
        id: 'd' + x.id,
        ini: x.horaInicio,
        fin: x.horaFin,
        clase: x.estado === 'DISPONIBLE' ? CLASE_DISPONIBLE : CLASE_BLOQUEADO,
        etiqueta: ESTADO_DISPONIBILIDAD[x.estado].label,
      }));
    const servs = servicios
      .filter((s) => s.nannieId === nannieActiva.id && enDia(s.fecha, dia))
      .map<Bloque>((s) => ({
        id: 's' + s.id,
        ini: s.horaInicio,
        fin: s.horaFin,
        clase: claseServicio(s.estado),
        etiqueta: `${TIPO_LABEL[s.tipoServicio]} ${s.horaInicio}–${s.horaFin}`,
      }));
    return [...disp, ...servs];
  };

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
        ) : modo === 'nannie' && !nannieActiva ? null : (
          <>
            {modo === 'nannie' && nannieActiva && (
              <p className="mb-2 text-sm font-medium text-texto-fuerte">
                {nannieActiva.nombre}
                {nannieActiva.zonas.length > 0 && (
                  <span className="text-texto-suave"> · {nannieActiva.zonas.join(', ')}</span>
                )}
              </p>
            )}
            <Rejilla dias={dias} bloques={modo === 'todas' ? bloquesTodas : bloquesNannie} />
            <Leyenda modo={modo} />
          </>
        )}
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

// ---------------- Rejilla de horas ----------------

function offset(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.max(HORA_MIN, Math.min(HORA_MAX, (h || 0) + (m || 0) / 60));
  return t - HORA_MIN;
}

type BloqueColocado = Bloque & { carril: number; carriles: number };

/** Asigna carriles a bloques que se traslapan, para mostrarlos lado a lado. */
function carriles(items: Bloque[]): BloqueColocado[] {
  const orden = [...items].sort((a, b) => offset(a.ini) - offset(b.ini) || offset(a.fin) - offset(b.fin));
  const finPorCarril: number[] = [];
  const colocados = orden.map((it) => {
    const oi = offset(it.ini);
    const of = offset(it.fin);
    let carril = finPorCarril.findIndex((f) => f <= oi + 1e-6);
    if (carril === -1) {
      carril = finPorCarril.length;
      finPorCarril.push(of);
    } else {
      finPorCarril[carril] = of;
    }
    return { it, carril };
  });
  const total = Math.max(1, finPorCarril.length);
  return colocados.map(({ it, carril }) => ({ ...it, carril, carriles: total }));
}

function Rejilla({ dias, bloques }: { dias: DiaSemana[]; bloques: (fecha: string) => Bloque[] }) {
  const alto = HORAS.length * ROW;
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[720px]">
        {/* Horas */}
        <div className="w-12 shrink-0" style={{ paddingTop: HEADER }}>
          {HORAS.map((h) => (
            <div
              key={h}
              style={{ height: ROW }}
              className="pr-1.5 text-right text-[11px] text-texto-suave"
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {/* Días */}
        <div className="flex flex-1">
          {dias.map((d) => (
            <div key={d.fecha} className="min-w-[92px] flex-1 border-l border-borde">
              <div
                style={{ height: HEADER }}
                className={cn(
                  'flex items-center justify-center text-[11px] capitalize',
                  d.esHoy ? 'font-semibold text-marca-azul' : 'text-texto-suave',
                )}
              >
                {d.etiqueta}
              </div>
              <div
                className="relative"
                style={{
                  height: alto,
                  backgroundImage: `repeating-linear-gradient(to bottom, #ffffff, #ffffff ${ROW - 1}px, #eef2f7 ${ROW - 1}px, #eef2f7 ${ROW}px)`,
                }}
              >
                {carriles(bloques(d.fecha)).map((b) => (
                  <div
                    key={b.id}
                    title={b.etiqueta}
                    style={{
                      position: 'absolute',
                      top: offset(b.ini) * ROW,
                      height: Math.max(offset(b.fin) - offset(b.ini), 0.5) * ROW - 2,
                      left: `calc(${(b.carril / b.carriles) * 100}% + 1px)`,
                      width: `calc(${100 / b.carriles}% - 2px)`,
                    }}
                    className={cn(
                      'overflow-hidden rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight',
                      b.clase,
                    )}
                  >
                    {b.etiqueta}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Leyenda({ modo }: { modo: Modo }) {
  const items = [
    { c: 'bg-amber-200', t: 'Disponible' },
    { c: 'bg-marca-rojo/40', t: 'Asignado' },
    { c: 'bg-marca-azul/40', t: 'Ofertado' },
    ...(modo === 'nannie' ? [{ c: 'bg-slate-300', t: 'Bloqueado' }] : []),
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-texto-suave">
      {items.map((i) => (
        <span key={i.t} className="flex items-center gap-1.5">
          <span className={cn('inline-block h-2.5 w-4 rounded-sm', i.c)} />
          {i.t}
        </span>
      ))}
    </div>
  );
}

// ---------------- Riel de decisiones ----------------

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
      <span className="inline-block rounded-full bg-marca-azul/15 px-2 py-0.5 text-[10px] font-medium text-marca-azul">
        Esperando su respuesta
      </span>
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
