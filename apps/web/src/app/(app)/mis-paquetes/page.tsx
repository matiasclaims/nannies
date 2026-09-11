'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { api, type MiPaquete } from '@/lib/api';
import { ESTADO_SERVICIO, TIPO_LABEL } from '@/lib/dominio';

/** Vista NANNIE · Mis paquetes: avance (horas cubiertas/restantes) y calendario
 *  de sesiones de los paquetes donde ella participa. Solo ve los suyos; sus
 *  sesiones van marcadas. */
export default function MisPaquetesPage() {
  const [data, setData] = useState<MiPaquete[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .misPaquetes()
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, []);

  if (estado === 'error') return <p className="p-8 text-center text-sm text-texto-suave">No se pudieron cargar tus paquetes.</p>;
  if (!data) return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center gap-2">
        <Package className="h-6 w-6 text-marca-azul" />
        <div>
          <h1 className="text-lg font-bold text-texto-fuerte">Mis paquetes</h1>
          <p className="text-xs text-texto-suave">Avance de los paquetes donde participas. Tus sesiones van marcadas.</p>
        </div>
      </header>

      {data.length === 0 ? (
        <div className="rounded-2xl bg-panel p-8 text-center text-sm text-texto-suave shadow-card">
          No tienes paquetes asignados por ahora.
        </div>
      ) : (
        data.map((p) => <TarjetaPaquete key={p.paqueteId} p={p} />)
      )}
    </div>
  );
}

function TarjetaPaquete({ p }: { p: MiPaquete }) {
  const pct = p.horasTotales > 0 ? Math.round((p.horasConsumidas / p.horasTotales) * 100) : 0;
  return (
    <section className="rounded-2xl bg-panel p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-texto-fuerte">{p.familia}</h2>
          <p className="text-xs text-texto-suave">
            {p.horasConsumidas} de {p.horasTotales} h cubiertas · <span className="font-semibold text-texto-fuerte">{p.horasRestantes} h restantes</span>
          </p>
        </div>
        <span
          className={
            p.estado === 'ACTIVO'
              ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700'
              : 'rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600'
          }
        >
          {p.estado === 'ACTIVO' ? 'Activo' : 'Terminado'}
        </span>
      </div>

      {/* Barra de avance */}
      <div className="mb-4">
        <div className="h-2 overflow-hidden rounded-full bg-fondo">
          <div className="h-2 rounded-full bg-marca-azul" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="mt-1 text-right text-[11px] text-texto-suave">{pct}% consumido</p>
      </div>

      {/* Sesiones */}
      {p.sesiones.length === 0 ? (
        <p className="text-xs text-texto-suave">Aún no hay sesiones registradas.</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <tbody>
            {p.sesiones.map((s, i) => (
              <tr key={i} className={`border-b border-borde last:border-0 align-top ${s.mia ? 'bg-marca-azul/5' : ''}`}>
                <td className="w-24 py-1.5 capitalize text-texto-fuerte">{fechaCorta(s.fecha)}</td>
                <td className="w-20 py-1.5 text-texto-suave">{s.horaInicio}–{s.horaFin}</td>
                <td className="py-1.5">
                  <span className="text-texto-fuerte">{TIPO_LABEL[s.tipoServicio]}</span>
                  {s.mia ? (
                    <span className="ml-1.5 rounded bg-marca-azul px-1.5 py-0.5 text-[10px] font-semibold text-white">Tú</span>
                  ) : null}
                </td>
                <td className="w-24 py-1.5 text-right text-texto-suave">{ESTADO_SERVICIO[s.estado].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** "2026-09-03" → "mié 3 sep" (fecha local, sin corrimiento). */
function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}
