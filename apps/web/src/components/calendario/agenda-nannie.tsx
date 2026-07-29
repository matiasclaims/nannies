'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import {
  api,
  type Servicio,
  type Disponibilidad,
  type RespuestaOferta,
} from '@/lib/api';
import { TIPO_LABEL, ESTADO_DISPONIBILIDAD } from '@/lib/dominio';
import type { DiaSemana } from '@/lib/semana';
import { cn } from '@/lib/utils';
import { FormMarcarDisponibilidad } from './form-marcar-disponibilidad';
import { HoraSelect } from '@/components/hora-select';

/** Vista de la nannie: sus ofertas arriba + su semana como agenda + marcar disponibilidad. */
export function AgendaNannie({ dias }: { dias: DiaSemana[] }) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [dispon, setDispon] = useState<Disponibilidad[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [marcando, setMarcando] = useState(false);

  const desde = dias[0]?.fecha;
  const hasta = dias[dias.length - 1]?.fecha;

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const [s, d] = await Promise.all([
        api.listarServicios({ desde, hasta }),
        api.listarDisponibilidad({ desde, hasta }),
      ]);
      setServicios(s);
      setDispon(d);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function responder(id: string, r: RespuestaOferta) {
    await api.responderOferta(id, r).catch(() => undefined);
    await cargar();
  }

  async function completar(id: string) {
    await api.completarServicio(id).catch(() => undefined);
    await cargar();
  }

  if (estado === 'error') {
    return <Aviso texto="No se pudo cargar tu agenda. ¿Está arriba la API?" />;
  }

  const ofertas = servicios.filter((s) => s.estado === 'OFERTADO');
  const enDia = (iso: string, dia: string) => iso.slice(0, 10) === dia;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Ofertas pendientes — cuadritos con ✓/✗ (ágil aunque haya muchas).
          No se muestran datos de la familia: solo tipo, fecha, horario y zona. */}
      {ofertas.length > 0 && (
        <div className="rounded-2xl bg-marca-azul/10 p-4">
          <p className="mb-2 text-sm font-semibold text-[#0b6b7d]">
            Tienes {ofertas.length} {ofertas.length === 1 ? 'oferta' : 'ofertas'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ofertas.map((s) => (
              <div key={s.id} className="flex flex-col rounded-xl bg-panel p-2.5 shadow-card">
                <p className="text-xs font-semibold leading-tight text-texto-fuerte">
                  {TIPO_LABEL[s.tipoServicio]}
                </p>
                <p className="mt-0.5 text-[11px] capitalize text-texto-suave">{fechaCorta(s.fecha)}</p>
                <p className="text-[11px] text-texto-suave">
                  {s.horaInicio}–{s.horaFin}
                </p>
                <p className="truncate text-[11px] text-texto-suave">{s.zona}</p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => responder(s.id, 'ACEPTO')}
                    title="Aceptar"
                    className="flex flex-1 items-center justify-center rounded-lg bg-marca-verde py-1.5 text-white transition hover:brightness-95"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => responder(s.id, 'RECHAZO')}
                    title="Rechazar"
                    className="flex flex-1 items-center justify-center rounded-lg border border-borde py-1.5 text-marca-rojo transition hover:bg-fondo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marcar disponibilidad */}
      <div className="rounded-2xl bg-panel p-4 shadow-card">
        <button
          onClick={() => setMarcando((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-marca-azul py-3.5 text-base font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          {marcando ? 'Cerrar' : '+ Marcar mi disponibilidad'}
        </button>
        {marcando && (
          <div className="mt-3">
            <FormMarcarDisponibilidad
              fechaInicial={desde ?? ''}
              onGuardado={async () => {
                setMarcando(false);
                await cargar();
              }}
            />
          </div>
        )}
      </div>

      {/* Mi semana (agenda) */}
      <div className="rounded-2xl bg-panel p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-texto-fuerte">Mi semana</h3>
        {estado === 'cargando' ? (
          <div className="h-32 animate-pulse rounded-xl bg-fondo" />
        ) : (
          <div className="space-y-2">
            {dias.map((d) => {
              const servs = servicios.filter((s) => enDia(s.fecha, d.fecha));
              const bloques = dispon.filter((x) => enDia(x.fecha, d.fecha));
              const vacio = servs.length === 0 && bloques.length === 0;
              return (
                <div
                  key={d.fecha}
                  className={cn(
                    'rounded-xl border border-borde p-3',
                    d.esHoy && 'border-marca-azul/40 bg-marca-azul/5',
                  )}
                >
                  <p
                    className={cn(
                      'mb-1 text-xs font-semibold capitalize',
                      d.esHoy ? 'text-marca-azul' : 'text-texto-suave',
                    )}
                  >
                    {d.etiqueta}
                  </p>
                  {vacio ? (
                    <p className="text-xs text-texto-suave">Sin actividad</p>
                  ) : (
                    <div className="space-y-1">
                      {servs.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-texto-fuerte">
                            <span className="font-medium">{TIPO_LABEL[s.tipoServicio]}</span>{' '}
                            {s.horaInicio}–{s.horaFin} · {s.zona}
                          </p>
                          {s.estado === 'ACEPTADO' && (
                            <button
                              onClick={() => completar(s.id)}
                              className="rounded-lg bg-marca-verde px-2.5 py-1 text-xs font-semibold text-white hover:brightness-95"
                            >
                              Marcar terminado
                            </button>
                          )}
                          {s.estado === 'COMPLETADO' && (
                            <span className="rounded-full bg-marca-rojo/20 px-2 py-0.5 text-[11px] font-semibold text-[#a3312f]">
                              Terminado
                            </span>
                          )}
                        </div>
                      ))}
                      {bloques.map((b) => (
                        <BloqueDispon key={b.id} b={b} onCambio={cargar} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Un bloque de disponibilidad con opción de editar la hora o eliminarlo
 *  (corregir un error de captura). */
function BloqueDispon({ b, onCambio }: { b: Disponibilidad; onCambio: () => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [ini, setIni] = useState(b.horaInicio);
  const [fin, setFin] = useState(b.horaFin);
  const [busy, setBusy] = useState(false);

  async function guardar() {
    if (fin <= ini) return;
    setBusy(true);
    await api.editarDisponibilidad(b.id, { horaInicio: ini, horaFin: fin }).catch(() => undefined);
    setEditando(false);
    await onCambio();
    setBusy(false);
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar este bloque de disponibilidad?')) return;
    setBusy(true);
    await api.eliminarDisponibilidad(b.id).catch(() => undefined);
    await onCambio();
    setBusy(false);
  }

  const inputCls =
    'w-[5.5rem] rounded-lg border border-borde bg-white px-2 py-1 text-xs outline-none focus:border-marca-azul';

  if (editando) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <HoraSelect value={ini} onChange={setIni} className={inputCls} />
        <span className="text-texto-suave">–</span>
        <HoraSelect value={fin} onChange={setFin} className={inputCls} />
        <button onClick={guardar} disabled={busy} className="text-marca-verde disabled:opacity-50" title="Guardar">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={() => setEditando(false)} className="text-texto-suave" title="Cancelar">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn('rounded-full px-2 py-0.5 font-medium', ESTADO_DISPONIBILIDAD[b.estado].clase)}>
        {ESTADO_DISPONIBILIDAD[b.estado].label}
      </span>
      <span className="text-texto-suave">
        {b.horaInicio}–{b.horaFin}
      </span>
      <button onClick={() => setEditando(true)} className="text-texto-suave hover:text-marca-azul" title="Editar">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={eliminar} disabled={busy} className="text-texto-suave hover:text-marca-rojo disabled:opacity-50" title="Eliminar">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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
