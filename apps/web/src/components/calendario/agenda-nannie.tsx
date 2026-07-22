'use client';

import { useCallback, useEffect, useState } from 'react';
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

  if (estado === 'error') {
    return <Aviso texto="No se pudo cargar tu agenda. ¿Está arriba la API?" />;
  }

  const ofertas = servicios.filter((s) => s.estado === 'OFERTADO');
  const enDia = (iso: string, dia: string) => iso.slice(0, 10) === dia;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Ofertas pendientes */}
      {ofertas.length > 0 && (
        <div className="rounded-2xl bg-marca-azul/10 p-4">
          <p className="mb-2 text-sm font-semibold text-[#0b6b7d]">
            Tienes {ofertas.length} {ofertas.length === 1 ? 'oferta' : 'ofertas'}
          </p>
          <div className="space-y-2">
            {ofertas.map((s) => (
              <div key={s.id} className="rounded-xl bg-panel p-3 shadow-card">
                <p className="text-sm font-semibold text-texto-fuerte">
                  {TIPO_LABEL[s.tipoServicio]} · {fechaCorta(s.fecha)}
                </p>
                <p className="mb-2 text-xs text-texto-suave">
                  {s.horaInicio}–{s.horaFin} · {s.zona}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => responder(s.id, 'ACEPTO')}
                    className="flex-1 rounded-lg bg-marca-verde px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => responder(s.id, 'RECHAZO')}
                    className="flex-1 rounded-lg border border-borde px-3 py-1.5 text-xs font-semibold text-marca-rojo hover:bg-fondo"
                  >
                    Rechazar
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
                        <p key={s.id} className="text-sm text-texto-fuerte">
                          <span className="font-medium">{TIPO_LABEL[s.tipoServicio]}</span>{' '}
                          {s.horaInicio}–{s.horaFin} · {s.zona}
                        </p>
                      ))}
                      {bloques.map((b) => (
                        <p key={b.id} className="text-xs">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 font-medium',
                              ESTADO_DISPONIBILIDAD[b.estado].clase,
                            )}
                          >
                            {ESTADO_DISPONIBILIDAD[b.estado].label}
                          </span>{' '}
                          <span className="text-texto-suave">
                            {b.horaInicio}–{b.horaFin}
                          </span>
                        </p>
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
