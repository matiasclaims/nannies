'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { api, type AvancePaquete } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';

const ESTADO: Record<string, { label: string; clase: string }> = {
  OFERTADO: { label: 'Programada', clase: 'bg-marca-azul/10 text-marca-azul' },
  ACEPTADO: { label: 'Programada', clase: 'bg-marca-azul/10 text-marca-azul' },
  COMPLETADO: { label: 'Realizada', clase: 'bg-marca-verde/20 text-[#3b6d11]' },
  CANCELADO: { label: 'Cancelada', clase: 'bg-fondo text-texto-suave line-through' },
};

/** Avance del paquete de horas para la FAMILIA (enlace de solo lectura, sin login). */
export default function AvancePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<AvancePaquete | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    api
      .avancePaquete(token)
      .then((d) => { setData(d); setEstado('ok'); })
      .catch(() => setEstado('error'));
  }, [token]);

  async function cancelar(servicioId: string) {
    if (!window.confirm('¿Cancelar esta fecha? La hora regresará a tu saldo y la podrás volver a agendar.')) return;
    setAviso(null);
    setCancelandoId(servicioId);
    try {
      await api.cancelarAvance(token, servicioId);
      const d = await api.avancePaquete(token);
      setData(d);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo cancelar. Contáctanos y te ayudamos.');
    } finally {
      setCancelandoId(null);
    }
  }

  if (estado === 'error') {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-texto-suave">Este enlace no es válido o el paquete ya no está disponible. Contáctanos si necesitas ayuda.</p>
      </div>
    );
  }
  if (!data) return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;

  const pct = data.horasTotales > 0 ? Math.round((data.horasConsumidas / data.horasTotales) * 100) : 0;
  const proximas = data.sesiones.filter((s) => s.estado === 'OFERTADO' || s.estado === 'ACEPTADO');
  const otras = data.sesiones.filter((s) => s.estado === 'COMPLETADO' || s.estado === 'CANCELADO');

  return (
    <div className="mx-auto max-w-md space-y-4 p-5">
      <header className="flex items-center gap-3 border-b border-borde pb-4">
        <Image src="/nannies-logo.png" alt="Nannies" width={100} height={40} className="h-10 w-auto" />
        <div>
          <h1 className="text-base font-bold text-[#17323b]">Avance de tu paquete</h1>
          <p className="text-xs text-texto-suave">{data.familia}</p>
        </div>
      </header>

      {/* Saldo */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-xs text-texto-suave">Horas disponibles</p>
            <p className="text-3xl font-bold text-marca-azul">{data.horasRestantes} h</p>
          </div>
          <p className="text-right text-xs text-texto-suave">
            de <strong className="text-texto-fuerte">{data.horasTotales} h</strong> contratadas
            <br />
            {data.horasConsumidas} h usadas / agendadas
          </p>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-fondo">
          <div className="h-full rounded-full bg-marca-verde transition-all" style={{ width: `${100 - pct}%` }} />
        </div>
        {data.estado === 'CONSUMIDO' && (
          <p className="mt-2 text-xs font-medium text-texto-suave">Este paquete ya se consumió por completo.</p>
        )}
        {data.asignacionManual && data.estado !== 'CONSUMIDO' && (
          <p className="mt-2 text-xs text-texto-suave">Las fechas se agendan conforme las vas pidiendo.</p>
        )}
      </div>

      {aviso && (
        <p className="rounded-xl bg-marca-rojo/10 px-3 py-2 text-xs text-marca-rojo">{aviso}</p>
      )}

      {/* Próximas sesiones (la familia puede cancelar las de ≥24h) */}
      <Bloque
        titulo="Próximas fechas"
        sesiones={proximas}
        vacio="Aún no tienes fechas programadas."
        onCancelar={cancelar}
        cancelandoId={cancelandoId}
      />
      {/* Historial (realizadas / canceladas) */}
      {otras.length > 0 && <Bloque titulo="Historial" sesiones={otras} vacio="" />}

      <p className="pt-2 text-center text-[11px] text-texto-suave">
        Nannies Child Care · Información de tu paquete en tiempo real. Cualquier ajuste, contáctanos.
      </p>
    </div>
  );
}

function Bloque({
  titulo,
  sesiones,
  vacio,
  onCancelar,
  cancelandoId,
}: {
  titulo: string;
  sesiones: AvancePaquete['sesiones'];
  vacio: string;
  onCancelar?: (servicioId: string) => void;
  cancelandoId?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <h2 className="mb-2 text-sm font-semibold text-texto-fuerte">{titulo}</h2>
      {sesiones.length === 0 ? (
        <p className="text-xs text-texto-suave">{vacio}</p>
      ) : (
        <div className="divide-y divide-borde">
          {sesiones.map((s, i) => {
            const e = ESTADO[s.estado] ?? { label: s.estado, clase: 'bg-fondo text-texto-suave' };
            return (
              <div key={i} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm capitalize text-texto-fuerte">{fechaLarga(s.fecha)}</p>
                  <p className="text-xs text-texto-suave">
                    {s.horaInicio}–{s.horaFin} · {TIPO_LABEL[s.tipoServicio]} · {s.duracionHoras} h
                  </p>
                  {onCancelar && s.cancelable && (
                    <button
                      type="button"
                      onClick={() => onCancelar(s.id)}
                      disabled={cancelandoId === s.id}
                      className="mt-1 text-xs font-medium text-marca-rojo underline underline-offset-2 disabled:opacity-50"
                    >
                      {cancelandoId === s.id ? 'Cancelando…' : 'Cancelar esta fecha'}
                    </button>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.clase}`}>{e.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fechaLarga(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}
