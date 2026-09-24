'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import {
  api,
  type Servicio,
  type Disponibilidad,
  type NannieLite,
  type Sesion,
  type DesbordeDecision,
} from '@/lib/api';
import { TIPO_LABEL, ESTADO_DISPONIBILIDAD } from '@/lib/dominio';
import type { DiaSemana } from '@/lib/semana';
import { dividirDiaNoche, horasEntre, TARIFA_NOCHE_MIN } from '@/lib/dia-noche';
import { Avatar } from '@/components/avatar';
import { NombreNannie } from '@/components/nombre-nannie';
import { cn } from '@/lib/utils';
import { FormMarcarDisponibilidad } from './form-marcar-disponibilidad';
import { HoraSelect } from '../hora-select';

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
  sub?: string; // segunda línea (p. ej. la familia), para no confundirla con la nannie
  detalle?: string; // texto completo (familia/niños/tipo/nannie) para el tooltip
  paquete?: boolean; // el servicio nació/es de un paquete de horas
}

/** Texto completo de un servicio para el tooltip del bloque (coordinación).
 *  Incluye familia + niños si vienen (solo coord los recibe). */
function detalleServicio(s: Servicio, nannie: string): string {
  const ninos = s.ninos && s.ninos.length ? ` (${s.ninos.join(', ')})` : '';
  const fam = s.familia ? `${s.familia}${ninos}` : '';
  return [fam, TIPO_LABEL[s.tipoServicio], nannie, `${s.horaInicio}–${s.horaFin}`].filter(Boolean).join(' · ');
}

// Colores estilo Google Calendar (ver dominio.ts).
const CLASE_DISPONIBLE = 'bg-amber-100 border border-amber-300 text-amber-800';
const CLASE_BLOQUEADO = 'bg-slate-200 border border-slate-300 text-slate-600';
// Servicio creado sin nannie (por asignar): morado punteado para que resalte.
const CLASE_SIN_ASIGNAR = 'bg-marca-morado/15 border border-dashed border-marca-morado/60 text-marca-morado';
function claseServicio(estado: Servicio['estado']): string {
  if (estado === 'OFERTADO') return 'bg-marca-azul/20 border border-marca-azul/40 text-marca-azul';
  if (estado === 'ACEPTADO' || estado === 'COMPLETADO')
    return 'bg-marca-rojo/20 border border-marca-rojo/50 text-[#a3312f]';
  if (estado === 'RECHAZADO') return 'bg-[#5B292D]/20 border border-[#5B292D]/50 text-[#5B292D]';
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
  const [editando, setEditando] = useState<Servicio | null>(null);

  const esCoord = sesion.rol !== 'NANNIE';
  // Abre el editor de horario al hacer clic en un bloque de servicio (id 's'+id).
  const abrirEditor = (bloqueId: string) => {
    if (!esCoord || !bloqueId.startsWith('s')) return;
    const s = servicios.find((x) => x.id === bloqueId.slice(1));
    if (s && s.estado !== 'CANCELADO' && s.estado !== 'RECHAZADO') setEditando(s);
  };

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
  const rechazadas = servicios.filter((s) => s.estado === 'RECHAZADO');
  const nannieActiva = nannies.find((n) => n.id === nannieSel) ?? nannies[0];

  // "Todas": solo disponibles + servicios asignados, con el nombre. Los bloqueos
  // NO se muestran aquí (reunión M3 con Paula: la vista de equipo se llenaría);
  // sí siguen visibles en "Por nannie".
  const bloquesTodas = (dia: string): Bloque[] => {
    const disp = dispon
      .filter((x) => enDia(x.fecha, dia) && x.estado === 'DISPONIBLE')
      .map<Bloque>((x) => ({
        id: 'd' + x.id,
        ini: x.horaInicio,
        fin: x.horaFin,
        clase: CLASE_DISPONIBLE,
        etiqueta: primerNombre(x.nannieId),
      }));
    const servs = servicios
      // Incluye también los servicios SIN nannie (por asignar): así aparecen en
      // la cuadrícula y se pueden abrir para asignar/cancelar/reprogramar.
      .filter((s) => (s.estado === 'OFERTADO' || s.estado === 'ACEPTADO') && enDia(s.fecha, dia))
      .map<Bloque>((s) => {
        const quien = s.nannieId ? primerNombre(s.nannieId) : 'Sin asignar';
        return {
          id: 's' + s.id,
          ini: s.horaInicio,
          fin: s.horaFin,
          clase: s.nannieId ? claseServicio(s.estado) : CLASE_SIN_ASIGNAR,
          etiqueta: quien,
          sub: s.familia ?? TIPO_LABEL[s.tipoServicio],
          detalle: detalleServicio(s, quien),
          paquete: s.formato === 'PAQUETE',
        };
      });
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
        etiqueta: s.familia ?? TIPO_LABEL[s.tipoServicio],
        sub: `${TIPO_LABEL[s.tipoServicio]} · ${s.horaInicio}–${s.horaFin}`,
        detalle: detalleServicio(s, nannieActiva.nombre),
        paquete: s.formato === 'PAQUETE',
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
                <NombreNannie nombre={nannieActiva.nombre} color={nannieActiva.color} />
                {nannieActiva.zonas.length > 0 && (
                  <span className="text-texto-suave"> · {nannieActiva.zonas.join(', ')}</span>
                )}
              </p>
            )}
            <Rejilla
              dias={dias}
              bloques={modo === 'todas' ? bloquesTodas : bloquesNannie}
              onBloqueClick={esCoord ? abrirEditor : undefined}
            />
            {esCoord && (
              <p className="mt-1 text-[11px] text-texto-suave">
                Toca un servicio para modificarlo (asignar, extender, reprogramar o cancelar). Los morados punteados están sin nannie.
              </p>
            )}
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
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
                      activa
                        ? 'bg-marca-azul/10 font-medium text-marca-azul'
                        : 'text-texto-suave hover:bg-fondo',
                    )}
                  >
                    <Avatar foto={n.foto} nombre={n.nombre} color={n.color} size={28} />
                    <NombreNannie nombre={n.nombre} color={n.color} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-panel p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-texto-fuerte">Requieren tu decisión</h3>
          {porAsignar.length === 0 && esperando.length === 0 && rechazadas.length === 0 ? (
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
              {rechazadas.length > 0 && (
                <div className="space-y-2 border-t border-borde pt-3">
                  <p className="text-xs font-semibold text-[#5B292D]">
                    Rechazadas esta semana ({rechazadas.length})
                  </p>
                  {rechazadas.map((s) => (
                    <TarjetaOfertar
                      key={s.id}
                      servicio={s}
                      nannies={nannies}
                      onHecho={cargar}
                      rechazadoPor={
                        nannies.find((n) => n.id === s.nannieId)?.nombre.split(' ')[0] ?? 'una nannie'
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editando && (
        <AccionesServicio
          servicio={editando}
          nannies={nannies}
          onClose={() => setEditando(null)}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}

/** Acciones sobre un servicio asignado (coordinación): editar hora fin (merodeo),
 *  reasignar a otra nannie, o cancelar (regla de 24h con decisión de cobro). */
function AccionesServicio({
  servicio,
  nannies,
  onClose,
  onGuardado,
}: {
  servicio: Servicio;
  nannies: NannieLite[];
  onClose: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputCls =
    'mt-1 w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

  // --- Horario (merodeo) ---
  const [horaFin, setHoraFin] = useState(servicio.horaFin);
  const [tarifaNoche, setTarifaNoche] = useState(140);
  // Desborde de paquete al extender: si las horas exceden el saldo, se pregunta.
  const [desborde, setDesborde] = useState(false);
  const [desModo, setDesModo] = useState<'INDIVIDUAL' | 'PAQUETE_NUEVO' | 'POR_DEFINIR'>('POR_DEFINIR');
  const [desCobro, setDesCobro] = useState('');
  const [desPaqueteHoras, setDesPaqueteHoras] = useState(20);
  const nuevaDur = horasEntre(servicio.horaInicio, horaFin);
  const { horasNoche } = nuevaDur ? dividirDiaNoche(servicio.horaInicio, nuevaDur) : { horasNoche: 0 };
  const cruzaNoche = horasNoche > 0;
  // Mínimo 3 h, salvo LUDOTECA (admite desde 1 h).
  const invalida = nuevaDur == null || (nuevaDur < 3 && servicio.tipoServicio !== 'LUDOTECA_MOVIL');

  // --- Reasignar ---
  const [nannieSel, setNannieSel] = useState('');
  const nombreActual = nannies.find((n) => n.id === servicio.nannieId)?.nombre;

  // --- Reprogramar (política 16c: individual pagado, tope 7 días) ---
  const [nuevaFecha, setNuevaFecha] = useState(servicio.fecha);
  const [nuevaHora, setNuevaHora] = useState(servicio.horaInicio);
  const diasReprog = Math.round(
    (new Date(`${nuevaFecha}T00:00:00`).getTime() - new Date(`${servicio.fecha}T00:00:00`).getTime()) / 86_400_000,
  );
  const esIndividual = servicio.formato === 'INDIVIDUAL';
  const excede7 = esIndividual && Math.abs(diasReprog) > 7;
  const sinCambioReprog = diasReprog === 0 && nuevaHora === servicio.horaInicio;

  // --- Cancelar (regla de 24h) ---
  const inicioDt = new Date(`${servicio.fecha}T${servicio.horaInicio}:00`);
  const horasHasta = (inicioDt.getTime() - Date.now()) / 3_600_000;
  const menos24 = horasHasta < 24;
  const [cobrar, setCobrar] = useState(menos24);
  const [motivo, setMotivo] = useState('');

  async function correr(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onGuardado();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
      setBusy(false);
    }
  }

  const guardarHorario = async () => {
    if (invalida) return setError('El horario debe dar horas completas y mínimo 3 h.');
    // Si ya se mostró el prompt de desborde, se reintenta con la decisión elegida.
    if (desborde) {
      if (desModo === 'INDIVIDUAL' && (!desCobro || Number(desCobro) <= 0)) {
        return setError('Indica el cobro de las horas de desborde.');
      }
      const decision: DesbordeDecision =
        desModo === 'INDIVIDUAL'
          ? { desbordeModo: 'INDIVIDUAL', desbordeCobro: Number(desCobro) }
          : desModo === 'PAQUETE_NUEVO'
            ? { desbordeModo: 'PAQUETE_NUEVO', desbordePaqueteHoras: desPaqueteHoras }
            : { desbordeModo: 'POR_DEFINIR' };
      return correr(() => api.editarHorario(servicio.id, horaFin, cruzaNoche ? tarifaNoche : undefined, decision));
    }
    // Primer intento sin decisión: si hay desborde, el backend lo pide y mostramos
    // el prompt (en vez de un error) para elegir cómo se cobran esas horas.
    setBusy(true);
    setError('');
    try {
      await api.editarHorario(servicio.id, horaFin, cruzaNoche ? tarifaNoche : undefined);
      await onGuardado();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo completar la acción.';
      setBusy(false);
      if (/desborde/i.test(msg)) setDesborde(true);
      else setError(msg);
    }
  };
  const reasignar = () => nannieSel && correr(() => api.reasignarServicio(servicio.id, nannieSel));
  const cancelar = () => correr(() => api.cancelarServicio(servicio.id, cobrar, motivo.trim() || undefined));
  const reprogramar = () => {
    if (excede7) return setError('Un servicio individual pagado solo puede reprogramarse dentro de 7 días.');
    if (sinCambioReprog) return setError('Elige una fecha u hora distinta a la actual.');
    return correr(() =>
      api.reprogramarServicio(servicio.id, nuevaFecha, nuevaHora !== servicio.horaInicio ? nuevaHora : undefined),
    );
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-borde bg-panel p-4 shadow-2xl">
        <h3 className="text-sm font-semibold text-texto-fuerte">
          {servicio.familia ?? 'Servicio'}
        </h3>
        {servicio.ninos && servicio.ninos.length > 0 && (
          <p className="mt-0.5 text-xs font-medium text-marca-azul">
            {servicio.ninos.length === 1 ? 'Peque: ' : 'Peques: '}{servicio.ninos.join(', ')}
          </p>
        )}
        <p className="mt-0.5 text-xs text-texto-suave">
          {TIPO_LABEL[servicio.tipoServicio]} · {fechaCorta(servicio.fecha)} · {servicio.horaInicio}–{servicio.horaFin}
          {servicio.zona && <> · {servicio.zona}</>}
          {nombreActual && <> · {nombreActual}</>}
        </p>

        <div className="mt-3 max-h-[66vh] space-y-3 overflow-y-auto pr-1">
          <section className="rounded-xl border border-borde p-3">
            <p className="mb-2 text-xs font-semibold text-texto-fuerte">Extender / cambiar horario</p>
            <label className="block text-xs font-medium text-texto-suave">Nueva hora fin</label>
            <HoraSelect value={horaFin} onChange={(v) => { setHoraFin(v); setDesborde(false); }} className={inputCls} />
            {nuevaDur != null && !invalida && (
              <p className="mt-2 text-xs text-texto-suave">
                Nueva duración: <strong className="text-texto-fuerte">{nuevaDur} h</strong>
                {cruzaNoche && <span className="text-marca-morado"> · entra a horario de noche ({horasNoche} h)</span>}
              </p>
            )}
            {cruzaNoche && !desborde && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-texto-suave">Tarifa de noche ($/h, mín ${TARIFA_NOCHE_MIN})</label>
                <input type="number" min={TARIFA_NOCHE_MIN} value={tarifaNoche} onChange={(e) => setTarifaNoche(Number(e.target.value))} className={inputCls} />
              </div>
            )}
            {desborde && (
              <div className="mt-3 rounded-xl border border-marca-rojo/40 bg-marca-rojo/5 p-2.5">
                <p className="text-xs text-texto-fuerte">
                  Estas horas exceden el saldo del paquete. ¿Cómo se cobran las horas de desborde?
                </p>
                <div className="mt-2 space-y-1.5 text-xs">
                  {([
                    ['POR_DEFINIR', 'Dejar por definir (adeudo)'],
                    ['INDIVIDUAL', 'Cobrar como horas individuales'],
                    ['PAQUETE_NUEVO', 'Pasar a un paquete nuevo'],
                  ] as const).map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2">
                      <input type="radio" checked={desModo === val} onChange={() => setDesModo(val)} />
                      <span className="text-texto-fuerte">{label}</span>
                    </label>
                  ))}
                </div>
                {desModo === 'INDIVIDUAL' && (
                  <div className="mt-2">
                    <label className="block text-texto-suave">Cobro de las horas de desborde ($)</label>
                    <input type="number" min={1} value={desCobro} onChange={(e) => setDesCobro(e.target.value)} className={inputCls} />
                  </div>
                )}
                {desModo === 'PAQUETE_NUEVO' && (
                  <div className="mt-2">
                    <label className="block text-texto-suave">Tamaño del paquete nuevo</label>
                    <select value={desPaqueteHoras} onChange={(e) => setDesPaqueteHoras(Number(e.target.value))} className={inputCls}>
                      {[10, 20, 30, 40, 50].map((h) => <option key={h} value={h}>Paquete de {h} h</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={guardarHorario} disabled={busy || invalida || (cruzaNoche && tarifaNoche < TARIFA_NOCHE_MIN)} className="rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? 'Guardando…' : desborde ? 'Confirmar' : 'Guardar horario'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-borde p-3">
            <p className="mb-2 text-xs font-semibold text-texto-fuerte">
              {servicio.nannieId ? 'Reasignar a otra nannie' : 'Asignar nannie'}
            </p>
            <p className="text-xs text-texto-suave">
              {servicio.nannieId
                ? 'Pasa este servicio a otra nannie (queda asignado directo).'
                : 'Asigna una nannie a este servicio (queda asignado directo).'}
            </p>
            <label className="mt-2 block text-xs font-medium text-texto-suave">Nueva nannie</label>
            <select value={nannieSel} onChange={(e) => setNannieSel(e.target.value)} className={inputCls}>
              <option value="">Elige…</option>
              {nannies.filter((n) => n.id !== servicio.nannieId).map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={reasignar} disabled={busy || !nannieSel} className="rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? 'Reasignando…' : 'Reasignar'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-borde p-3">
            <p className="mb-2 text-xs font-semibold text-texto-fuerte">Reprogramar (otra fecha)</p>
            <p className="text-xs text-texto-suave">Mueve el servicio a otra fecha (conserva nannie, duración y cobro).</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-texto-suave">Nueva fecha</label>
                <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-texto-suave">Hora inicio</label>
                <HoraSelect value={nuevaHora} onChange={setNuevaHora} className={inputCls} />
              </div>
            </div>
            {excede7 ? (
              <p className="mt-2 rounded-lg bg-marca-rojo/10 px-3 py-2 text-xs text-marca-rojo">
                Un servicio individual pagado solo puede reprogramarse dentro de 7 días (elegiste {Math.abs(diasReprog)}).
              </p>
            ) : (
              esIndividual && (
                <p className="mt-2 text-[11px] text-texto-suave">
                  Servicio individual pagado: máximo 7 días de la fecha original. Recuerda avisar con ≥24 h.
                </p>
              )
            )}
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={reprogramar} disabled={busy || excede7 || sinCambioReprog} className="rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? 'Reprogramando…' : 'Reprogramar'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-marca-rojo/30 p-3">
            <p className="mb-2 text-xs font-semibold text-marca-rojo">Cancelar servicio</p>
            <p className={cn('rounded-lg px-3 py-2 text-xs', menos24 ? 'bg-amber-50 text-amber-800' : 'bg-marca-verde/15 text-[#3b6d11]')}>
              {horasHasta >= 0
                ? <>Faltan <strong>{Math.round(horasHasta)} h</strong> para el servicio. Por la regla de 24 h, {menos24 ? <>se <strong>cobra</strong> la hora.</> : <>no se cobra.</>}</>
                : 'El servicio ya pasó.'}
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm text-texto-fuerte">
              <input type="checkbox" checked={cobrar} onChange={(e) => setCobrar(e.target.checked)} className="h-4 w-4" />
              Cobrar la hora
            </label>
            <p className="mt-0.5 text-[11px] text-texto-suave">
              {cobrar ? 'La hora se cobra (en paquete se pierde del saldo).' : 'No se cobra; en paquete se devuelve la hora al saldo.'}
            </p>
            <label className="mt-2 block text-xs font-medium text-texto-suave">Motivo (opcional)</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} placeholder="Ej. el niño está enfermo" />
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={cancelar} disabled={busy} className="rounded-lg bg-marca-rojo px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? 'Cancelando…' : 'Cancelar servicio'}
              </button>
            </div>
          </section>
        </div>

        {error && <p className="mt-2 text-xs text-marca-rojo">{error}</p>}

        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-borde px-3 py-1.5 text-sm text-texto-suave hover:bg-fondo">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Rejilla de horas ----------------

function offset(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const hh = (h || 0) === 0 ? 24 : h; // 00:00 = medianoche = fin de día (24:00)
  const t = Math.max(HORA_MIN, Math.min(HORA_MAX, hh + (m || 0) / 60));
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

function Rejilla({
  dias,
  bloques,
  onBloqueClick,
}: {
  dias: DiaSemana[];
  bloques: (fecha: string) => Bloque[];
  onBloqueClick?: (id: string) => void;
}) {
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
              <Link
                href={`/dia/${d.fecha}`}
                title={`Ver el detalle de ${d.etiqueta}`}
                style={{ height: HEADER }}
                className={cn(
                  'flex items-center justify-center text-[11px] capitalize transition hover:bg-fondo hover:text-marca-azul',
                  d.esHoy ? 'font-semibold text-marca-azul' : 'text-texto-suave',
                )}
              >
                {d.etiqueta}
              </Link>
              <div
                className="relative"
                style={{
                  height: alto,
                  backgroundImage: `repeating-linear-gradient(to bottom, #ffffff, #ffffff ${ROW - 1}px, #eef2f7 ${ROW - 1}px, #eef2f7 ${ROW}px)`,
                }}
              >
                {carriles(bloques(d.fecha)).map((b) => {
                  const clickable = !!onBloqueClick && b.id.startsWith('s');
                  return (
                    <div
                      key={b.id}
                      title={`${b.detalle ?? b.etiqueta}${b.paquete ? ' · Paquete de horas' : ''}`}
                      onClick={clickable ? () => onBloqueClick!(b.id) : undefined}
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
                        clickable && 'cursor-pointer hover:brightness-95',
                      )}
                    >
                      <span className="block truncate font-semibold">
                        {b.paquete && <Package className="mr-0.5 inline h-2.5 w-2.5 shrink-0 align-[-1px]" aria-label="Paquete" />}
                        {b.etiqueta}
                      </span>
                      {b.sub && <span className="block truncate font-normal opacity-80">{b.sub}</span>}
                    </div>
                  );
                })}
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
    // Bloqueado y Rechazado solo aparecen en la vista "Por nannie".
    ...(modo === 'nannie'
      ? [
          { c: 'bg-slate-300', t: 'Bloqueado' },
          { c: 'bg-[#5B292D]/40', t: 'Rechazado' },
        ]
      : []),
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
  rechazadoPor,
}: {
  servicio: Servicio;
  nannies: NannieLite[];
  onHecho: () => Promise<void>;
  rechazadoPor?: string;
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
    <div
      className={cn(
        'rounded-xl border p-2.5',
        rechazadoPor ? 'border-[#5B292D]/40 bg-[#5B292D]/5' : 'border-borde',
      )}
    >
      {rechazadoPor && (
        <p className="mb-1.5 inline-block rounded-full bg-[#5B292D]/20 px-2 py-0.5 text-[10px] font-semibold text-[#5B292D]">
          Rechazado por {rechazadoPor} · reofrecer a otra
        </p>
      )}
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
