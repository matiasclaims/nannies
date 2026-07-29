'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Printer } from 'lucide-react';
import { api, type Proyeccion } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';

/** Proyección de horas de un paquete, con marca Nannies, lista para imprimir o
 *  guardar como PDF y compartir con la familia (punto 12 · reunión M2). */
export default function ProyeccionPage() {
  const { paqueteId } = useParams<{ paqueteId: string }>();
  const [data, setData] = useState<Proyeccion | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .proyeccionPaquete(paqueteId)
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, [paqueteId]);

  if (estado === 'error') {
    return <p className="p-8 text-center text-sm text-texto-suave">No se pudo cargar la proyección.</p>;
  }
  if (!data) {
    return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-texto-fuerte print:p-0">
      {/* Encabezado con marca */}
      <header className="mb-6 flex items-center justify-between border-b border-borde pb-4">
        <Image src="/nannies-logo.png" alt="Nannies" width={120} height={48} className="h-12 w-auto" />
        <div className="text-right">
          <h1 className="text-lg font-bold text-[#17323b]">Proyección de horas</h1>
          <p className="text-xs text-texto-suave">
            {data.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'} · Nannies Child Care
          </p>
        </div>
      </header>

      {/* Familia + saldo */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-texto-suave">Familia</p>
          <p className="text-base font-semibold">{data.familia}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-texto-suave">
            Paquete de <strong className="text-texto-fuerte">{data.paquete.horasTotales} h</strong>
          </p>
          <p className="text-texto-suave">
            Programadas {data.paquete.horasConsumidas} h · restan{' '}
            <strong className="text-texto-fuerte">{data.paquete.horasRestantes} h</strong>
          </p>
        </div>
      </div>

      {/* Sesiones */}
      {data.sesiones.length === 0 ? (
        <p className="rounded-lg bg-fondo p-4 text-center text-sm text-texto-suave">
          Aún no hay sesiones programadas para este paquete.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#f0d6d5] text-left text-xs text-texto-suave">
              <th className="py-2">Fecha</th>
              <th className="py-2">Horario</th>
              <th className="py-2">Servicio</th>
              <th className="py-2">Nannie</th>
            </tr>
          </thead>
          <tbody>
            {data.sesiones.map((s, i) => (
              <tr key={i} className="border-b border-borde">
                <td className="py-2 capitalize">{fechaLarga(s.fecha)}</td>
                <td className="py-2">
                  {s.horaInicio}–{s.horaFin}
                </td>
                <td className="py-2">{TIPO_LABEL[s.tipoServicio]}</td>
                <td className="py-2">{s.nannie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6 text-center text-[11px] text-texto-suave">
        Nannies Child Care · Este documento es una proyección de las fechas programadas de tu
        paquete. Cualquier ajuste, contáctanos.
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

function fechaLarga(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}
