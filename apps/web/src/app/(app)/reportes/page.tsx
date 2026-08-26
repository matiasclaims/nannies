'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, AlertTriangle } from 'lucide-react';
import { api, type ReporteGeneral } from '@/lib/api';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Rango del mes (año, mes 0-11) → { desde, hasta } en YYYY-MM-DD. */
function rangoMes(y: number, m: number) {
  const dd = (d: number) => String(d).padStart(2, '0');
  const ultimo = new Date(y, m + 1, 0).getDate();
  return { desde: `${y}-${dd(m + 1)}-01`, hasta: `${y}-${dd(m + 1)}-${dd(ultimo)}` };
}

export default function ReportesPage() {
  const hoy = new Date();
  const [y, setY] = useState(hoy.getFullYear());
  const [m, setM] = useState(hoy.getMonth());
  const [data, setData] = useState<ReporteGeneral | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const { desde, hasta } = rangoMes(y, m);

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      setData(await api.reporteGeneral(desde, hasta));
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const mover = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setY(d.getFullYear());
    setM(d.getMonth());
  };

  const descargarPDF = () => window.open(`/reportes-pdf?desde=${desde}&hasta=${hasta}`, '_blank');

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-texto-fuerte">Reportes</h1>
          <p className="text-xs text-texto-suave">Actividad de cada nannie en el mes. Clic en una para su reporte detallado; o descárgalo en PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-panel px-2 py-1 shadow-card">
            <button onClick={() => mover(-1)} className="rounded-lg p-1 hover:bg-fondo" aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-36 text-center text-sm font-medium capitalize text-texto-fuerte">
              {MESES[m]} {y}
            </span>
            <button onClick={() => mover(1)} className="rounded-lg p-1 hover:bg-fondo" aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={descargarPDF}
            className="flex items-center gap-2 rounded-xl bg-marca-azul px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            <Download className="h-4 w-4" /> Descargar PDF
          </button>
        </div>
      </div>

      {estado === 'error' ? (
        <p className="rounded-2xl bg-panel p-6 text-center text-sm text-texto-suave shadow-card">
          No se pudo cargar el reporte. ¿Está arriba la API?
        </p>
      ) : estado === 'cargando' ? (
        <div className="h-64 animate-pulse rounded-2xl bg-panel" />
      ) : data && data.nannies.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl bg-panel shadow-card">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-borde text-left text-xs text-texto-suave">
                <th className="px-4 py-3">Nannie</th>
                <th className="px-3 py-3 text-center">Servicios</th>
                <th className="px-3 py-3 text-center">Horas</th>
                <th className="px-3 py-3 text-center">Papás</th>
                <th className="px-3 py-3 text-center">Agencia</th>
                <th className="px-3 py-3 text-center">Incidencias</th>
              </tr>
            </thead>
            <tbody>
              {data.nannies.map((n) => (
                <tr
                  key={n.nannieId}
                  onClick={() => window.open(`/reporte-nannie?nannieId=${n.nannieId}&desde=${desde}&hasta=${hasta}`, '_blank')}
                  className="cursor-pointer border-b border-borde last:border-0 hover:bg-fondo"
                  title="Ver reporte detallado de esta nannie"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: n.color ?? '#CBD5E1' }} />
                      <span className="font-medium text-texto-fuerte">{n.nombre}</span>
                      {n.prueba && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">prueba</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-texto-fuerte">{n.servicios}</td>
                  <td className="px-3 py-2.5 text-center text-texto-suave">{n.horas} h</td>
                  <td className="px-3 py-2.5 text-center">
                    {n.calificacionPapas == null ? (
                      <span className="text-texto-suave">—</span>
                    ) : (
                      <span className={n.calificacionPapas < 7.5 ? 'font-semibold text-marca-rojo' : 'text-texto-fuerte'}>
                        {n.calificacionPapas}
                        <span className="text-[11px] text-texto-suave"> ({n.evaluacionPapasN})</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-texto-fuerte">
                    {n.evaluacionAgencia == null ? <span className="text-texto-suave">—</span> : n.evaluacionAgencia}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {n.incidencias > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-marca-rojo">
                        <AlertTriangle className="h-3.5 w-3.5" /> {n.incidencias}
                      </span>
                    ) : (
                      <span className="text-texto-suave">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-borde text-sm font-semibold text-texto-fuerte">
                <td className="px-4 py-3">Totales</td>
                <td className="px-3 py-3 text-center">{data.totales.servicios}</td>
                <td className="px-3 py-3 text-center">{data.totales.horas} h</td>
                <td className="px-3 py-3 text-center text-texto-suave">—</td>
                <td className="px-3 py-3 text-center text-texto-suave">—</td>
                <td className="px-3 py-3 text-center">{data.totales.incidencias}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl bg-panel p-6 text-center text-sm text-texto-suave shadow-card">
          No hay nannies activas para reportar.
        </p>
      )}

      <p className="text-center text-[11px] text-texto-suave">
        Papás = promedio de la encuesta de papás (nº de opiniones). Agencia = evaluación semanal de coordinación.
      </p>
    </div>
  );
}
