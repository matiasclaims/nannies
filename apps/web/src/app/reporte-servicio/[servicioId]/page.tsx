'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Printer } from 'lucide-react';
import { api, type HojaReporte } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';

const fechaLarga = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Hoja imprimible del reporte de un servicio, con marca Nannies, lista para
 *  guardar como PDF y enviar al papá (Mario 2026-09-22). Coordinación la abre
 *  con su sesión; el papá recibe el PDF (no la liga). */
export default function HojaReportePage() {
  const { servicioId } = useParams<{ servicioId: string }>();
  const [data, setData] = useState<HojaReporte | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .hojaReporte(servicioId)
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, [servicioId]);

  if (estado === 'error') {
    return <p className="p-8 text-center text-sm text-texto-suave">No se pudo cargar el reporte.</p>;
  }
  if (!data) {
    return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-texto-fuerte print:p-0">
      <header className="mb-6 flex items-center justify-between border-b border-borde pb-4">
        <Image src="/nannies-logo.png" alt="Nannies" width={120} height={48} className="h-12 w-auto" />
        <div className="text-right">
          <h1 className="text-lg font-bold text-[#17323b]">Reporte de servicio</h1>
          <p className="text-xs capitalize text-texto-suave">{fechaLarga(data.fecha)}</p>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
        <Campo label="Familia" valor={data.familia} />
        <Campo label={data.ninos.length === 1 ? 'Peque' : 'Peques'} valor={data.ninos.length ? data.ninos.join(', ') : '—'} />
        <Campo label="Servicio" valor={TIPO_LABEL[data.tipoServicio]} />
        <Campo label="Horario" valor={`${data.horaInicio}–${data.horaFin}`} />
        {data.zona && <Campo label="Zona" valor={data.zona} />}
        <Campo label="Nannie" valor={data.nannie} />
      </div>

      {data.reporte ? (
        <div className="space-y-3 text-sm">
          <Bloque titulo="Ánimo del peque" texto={data.reporte.animoNino} />
          <Bloque titulo="Actividades realizadas" texto={data.reporte.actividades} />
          {data.reporte.incidentes && <Bloque titulo="Incidentes u observaciones" texto={data.reporte.incidentes} />}
          {data.reporte.notas && <Bloque titulo="Notas y recomendaciones" texto={data.reporte.notas} />}
          <p className="pt-2 text-xs text-texto-suave">Reporte elaborado por {data.reporte.autor}.</p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-borde p-6 text-center text-sm text-texto-suave">
          Este servicio aún no tiene reporte.
        </p>
      )}

      <footer className="mt-8 border-t border-borde pt-4 text-center text-xs text-texto-suave">
        Nannies Child Care · Gracias por confiar en nosotros.
      </footer>

      {/* Botón de imprimir — se oculta al imprimir */}
      <div className="mt-6 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-marca-azul px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          <Printer className="h-4 w-4" /> Imprimir o guardar como PDF
        </button>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-texto-suave">{label}</p>
      <p className="font-medium text-texto-fuerte">{valor}</p>
    </div>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold text-marca-azul">{titulo}</p>
      <p className="whitespace-pre-line rounded-lg bg-fondo px-3 py-2 text-texto-fuerte print:bg-white print:px-0">{texto}</p>
    </div>
  );
}
