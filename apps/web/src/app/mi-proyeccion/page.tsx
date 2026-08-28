'use client';

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { api, type MiProyeccion } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';

/** Proyección de fechas de la NANNIE: su agenda a futuro (confirmadas y por
 *  responder), para ver o descargar en PDF. Útil con paquetes de varios meses. */
export default function MiProyeccionPage() {
  const [data, setData] = useState<MiProyeccion | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .miProyeccion()
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, []);

  if (estado === 'error') return <p className="p-8 text-center text-sm text-texto-suave">No se pudo cargar tu agenda.</p>;
  if (!data) return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;

  // Agrupar por mes (encabezado por mes para leerla de corrido).
  const porMes = new Map<string, MiProyeccion['sesiones']>();
  for (const s of data.sesiones) {
    const clave = s.fecha.slice(0, 7);
    const arr = porMes.get(clave);
    if (arr) arr.push(s);
    else porMes.set(clave, [s]);
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-texto-fuerte print:p-0">
      <header className="mb-6 border-b border-borde pb-4">
        <h1 className="text-lg font-bold text-[#17323b]">Mis próximas fechas</h1>
        <p className="text-xs text-texto-suave">{data.nombre}</p>
      </header>

      {data.sesiones.length === 0 ? (
        <p className="rounded-lg bg-fondo p-4 text-center text-sm text-texto-suave">
          No tienes fechas programadas por ahora.
        </p>
      ) : (
        [...porMes.entries()].map(([mes, sesiones]) => (
          <section key={mes} className="mb-5">
            <h2 className="mb-1 border-b-2 border-[#f0d6d5] pb-1 text-sm font-semibold capitalize text-[#17323b]">
              {mesLargo(mes)}
            </h2>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {sesiones.map((s, i) => (
                  <tr key={i} className="border-b border-borde last:border-0 align-top">
                    <td className="w-28 py-2 capitalize">{fechaCorta(s.fecha)}</td>
                    <td className="w-24 py-2">
                      {s.horaInicio}–{s.horaFin}
                    </td>
                    <td className="py-2">
                      <span className="font-medium">{TIPO_LABEL[s.tipoServicio]}</span> · {s.familia}
                      {s.zona ? <span className="text-texto-suave"> · {s.zona}</span> : null}
                      {s.direccion ? <div className="text-xs text-texto-suave">{s.direccion}</div> : null}
                      {s.pendiente ? (
                        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          por responder
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      <p className="mt-6 text-[11px] text-texto-suave">
        Fechas confirmadas y por responder. Cualquier ajuste, coordínalo con Paula o Jackie.
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

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-09" → "septiembre 2026". */
function mesLargo(clave: string): string {
  const [y, m] = clave.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
}

/** "2026-09-03" → "mié 3 sep" (fecha local, sin corrimiento). */
function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}
