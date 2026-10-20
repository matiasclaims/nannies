'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Printer } from 'lucide-react';
import { api, type HojaPlaneacion } from '@/lib/api';
import { etiquetaServicio } from '@/lib/dominio';

/** Hoja de planeación de un servicio, con marca Nannies, lista para imprimir o
 *  guardar como PDF. Formato Hora/Actividad/Objetivo/Material. */
export default function HojaPlaneacionPage() {
  const { servicioId } = useParams<{ servicioId: string }>();
  const [data, setData] = useState<HojaPlaneacion | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .hojaPlaneacion(servicioId)
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, [servicioId]);

  if (estado === 'error') {
    return <p className="p-8 text-center text-sm text-texto-suave">No se pudo cargar la planeación.</p>;
  }
  if (!data) {
    return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;
  }

  const items = data.planeacion?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-texto-fuerte print:p-0">
      {/* Encabezado con marca */}
      <header className="mb-6 flex items-center justify-between border-b border-borde pb-4">
        <Image src="/nannies-logo.png" alt="Nannies" width={120} height={48} className="h-12 w-auto" />
        <div className="text-right">
          <h1 className="text-lg font-bold text-[#17323b]">Planeación del servicio</h1>
          <p className="text-xs text-texto-suave">
            {data.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'} · Nannies Child Care
          </p>
        </div>
      </header>

      {/* Datos del servicio */}
      <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Dato label="Familia" valor={data.familia} />
        <Dato label="Nannie" valor={data.nannie} />
        <Dato label="Fecha" valor={fechaLarga(data.fecha)} />
        <Dato label="Horario" valor={`${data.horaInicio}–${data.horaFin}`} />
        <Dato label="Servicio" valor={etiquetaServicio(data.tipoServicio, data.esPaquete)} />
        {data.zona && <Dato label="Zona" valor={data.zona} />}
        {data.ninos.length > 0 && (
          <div className="col-span-2">
            <Dato label={data.ninos.length === 1 ? 'Peque' : 'Peques'} valor={data.ninos.join(', ')} />
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg bg-fondo p-4 text-center text-sm text-texto-suave">
          Aún no se ha capturado la planeación de este servicio.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#f0d6d5] text-left text-xs text-texto-suave">
              <th className="w-20 px-2 py-2">Hora</th>
              <th className="px-2 py-2">Actividad</th>
              <th className="px-2 py-2">Objetivo</th>
              <th className="px-2 py-2">Material</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-borde align-top">
                <td className="px-2 py-2">{it.hora || '—'}</td>
                <td className="px-2 py-2">{it.actividad}</td>
                <td className="px-2 py-2">{it.objetivo || '—'}</td>
                <td className="px-2 py-2">{it.material || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6 text-center text-[11px] text-texto-suave">
        Nannies Child Care · Planeación de actividades del servicio.
      </p>

      {/* Acción (no se imprime) */}
      <div className="mt-6 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-texto-suave">{label}</p>
      <p className="font-medium capitalize text-texto-fuerte">{valor}</p>
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
