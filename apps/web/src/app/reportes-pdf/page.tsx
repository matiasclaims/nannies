'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Printer } from 'lucide-react';
import { api, type ReporteGeneral } from '@/lib/api';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function periodo(desde: string): string {
  const [y, m] = desde.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
}

/** Reporte general de nannies con marca Nannies, listo para imprimir / guardar
 *  como PDF (M6). Fuera del shell de la app; se abre desde /reportes. */
export default function ReportesPdfPage() {
  const [data, setData] = useState<ReporteGeneral | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const desde = q.get('desde');
    const hasta = q.get('hasta');
    if (!desde || !hasta) {
      setEstado('error');
      return;
    }
    api
      .reporteGeneral(desde, hasta)
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, []);

  if (estado === 'error') return <p className="p-8 text-center text-sm text-texto-suave">No se pudo cargar el reporte.</p>;
  if (!data) return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-texto-fuerte print:p-0">
      <header className="mb-6 flex items-center justify-between border-b border-borde pb-4">
        <Image src="/nannies-logo.png" alt="Nannies" width={120} height={48} className="h-12 w-auto" />
        <div className="text-right">
          <h1 className="text-lg font-bold text-[#17323b]">Reporte de nannies</h1>
          <p className="text-xs capitalize text-texto-suave">{periodo(data.desde)} · Nannies Child Care</p>
        </div>
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[#f0d6d5] text-left text-xs text-texto-suave">
            <th className="py-2 pr-2">Nannie</th>
            <th className="py-2 px-2 text-center">Servicios</th>
            <th className="py-2 px-2 text-center">Horas</th>
            <th className="py-2 px-2 text-center">Papás</th>
            <th className="py-2 px-2 text-center">Agencia</th>
            <th className="py-2 pl-2 text-center">Incid.</th>
          </tr>
        </thead>
        <tbody>
          {data.nannies.map((n) => (
            <tr key={n.nannieId} className="border-b border-borde">
              <td className="py-2 pr-2">
                {n.nombre}
                {n.prueba ? ' (prueba)' : ''}
              </td>
              <td className="py-2 px-2 text-center">{n.servicios}</td>
              <td className="py-2 px-2 text-center">{n.horas}</td>
              <td className="py-2 px-2 text-center">
                {n.calificacionPapas == null ? '—' : `${n.calificacionPapas} (${n.evaluacionPapasN})`}
              </td>
              <td className="py-2 px-2 text-center">{n.evaluacionAgencia == null ? '—' : n.evaluacionAgencia}</td>
              <td className="py-2 pl-2 text-center">{n.incidencias}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#f0d6d5] font-semibold">
            <td className="py-2 pr-2">Totales</td>
            <td className="py-2 px-2 text-center">{data.totales.servicios}</td>
            <td className="py-2 px-2 text-center">{data.totales.horas}</td>
            <td className="py-2 px-2 text-center">—</td>
            <td className="py-2 px-2 text-center">—</td>
            <td className="py-2 pl-2 text-center">{data.totales.incidencias}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-6 text-[11px] text-texto-suave">
        Papás = promedio de la encuesta de papás (nº de opiniones entre paréntesis). Agencia = evaluación semanal de
        coordinación. Incid. = incidencias registradas en el periodo (sin condonadas).
      </p>

      <div className="mt-6 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );
}
