'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { api, type ReporteNannie } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const periodo = (desde: string) => {
  const [y, m] = desde.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
};

/** Reporte detallado de UNA nannie en el periodo, con marca Nannies, para
 *  imprimir / guardar como PDF (M6 · Bloque 2). Fuera del shell; se abre desde /reportes. */
export default function ReporteNanniePage() {
  const [d, setD] = useState<ReporteNannie | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const nannieId = q.get('nannieId');
    const desde = q.get('desde');
    const hasta = q.get('hasta');
    if (!nannieId || !desde || !hasta) {
      setEstado('error');
      return;
    }
    api
      .reporteNannie(nannieId, desde, hasta)
      .then((r) => {
        setD(r);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, []);

  if (estado === 'error') return <p className="p-8 text-center text-sm text-texto-suave">No se pudo cargar el reporte.</p>;
  if (!d) return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;

  const k = d.kpis;
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-texto-fuerte print:p-0">
      <header className="mb-5 border-b border-borde pb-4">
        <h1 className="text-lg font-bold text-[#17323b]">
          Reporte · {d.nannie.nombre}
          {d.nannie.prueba ? ' (mes de prueba)' : ''}
        </h1>
        <p className="text-xs capitalize text-texto-suave">{periodo(d.desde)}</p>
      </header>

      {d.nannie.especialidad && <p className="mb-4 text-xs italic text-texto-suave">{d.nannie.especialidad}</p>}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
        <Kpi label="Servicios" valor={String(k.servicios)} />
        <Kpi label="Horas" valor={`${k.horas} h`} />
        <Kpi label="Papás" valor={k.calificacionPapas == null ? '—' : `${k.calificacionPapas}`} sub={k.evaluacionPapasN ? `${k.evaluacionPapasN} opiniones` : ''} />
        <Kpi label="Agencia" valor={k.evaluacionAgencia == null ? '—' : `${k.evaluacionAgencia}`} />
        <Kpi label="Incidencias" valor={String(k.incidencias)} />
      </div>

      <Seccion titulo={`Reportes de servicio (${d.reportes.length})`}>
        {d.reportes.length === 0 ? (
          <Vacio texto="Sin reportes de servicio en el periodo." />
        ) : (
          d.reportes.map((r, i) => (
            <div key={i} className="border-b border-borde py-2 text-sm last:border-0">
              <p className="font-medium">
                {TIPO_LABEL[r.tipoServicio]} · {r.familia} · <span className="text-texto-suave">{r.fecha}</span> ·{' '}
                <span className="text-texto-suave">ánimo: {r.animoNino}</span>
              </p>
              <p className="text-xs text-texto-suave"><strong className="text-texto-fuerte">Actividades:</strong> {r.actividades}</p>
              {r.incidentes && <p className="text-xs text-texto-suave"><strong className="text-texto-fuerte">Incidentes:</strong> {r.incidentes}</p>}
              {r.notas && <p className="text-xs text-texto-suave"><strong className="text-texto-fuerte">Notas:</strong> {r.notas}</p>}
            </div>
          ))
        )}
      </Seccion>

      <Seccion titulo={`Evaluaciones de papás (${d.evaluacionesPapas.length})`}>
        {d.evaluacionesPapas.length === 0 ? (
          <Vacio texto="Sin evaluaciones de papás en el periodo." />
        ) : (
          d.evaluacionesPapas.map((e, i) => (
            <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-borde py-2 text-sm last:border-0">
              <span>
                <strong>{e.calificacion}/10</strong> · {e.familia} · <span className="text-texto-suave">{e.fecha}</span>
                {e.volveriaContratar != null && <span className="text-texto-suave"> · {e.volveriaContratar ? 'volvería' : 'no volvería'}</span>}
                {e.comentario && <span className="text-texto-suave"> — “{e.comentario}”</span>}
              </span>
            </div>
          ))
        )}
      </Seccion>

      <Seccion titulo={`Incidencias (${d.incidencias.length})`}>
        {d.incidencias.length === 0 ? (
          <Vacio texto="Sin incidencias en el periodo." />
        ) : (
          d.incidencias.map((i, idx) => (
            <div key={idx} className="border-b border-borde py-2 text-sm last:border-0">
              <p>
                {i.situacion} · <span className="text-texto-suave">{i.fecha}</span>
                {i.condonada && <span className="text-texto-suave"> · condonada</span>}
              </p>
              {i.nota && <p className="text-xs text-texto-suave">{i.nota}</p>}
            </div>
          ))
        )}
      </Seccion>

      <Seccion titulo={`Evaluación de agencia (${d.evaluacionesAgencia.length})`}>
        {d.evaluacionesAgencia.length === 0 ? (
          <Vacio texto="Sin evaluaciones de agencia en el periodo." />
        ) : (
          d.evaluacionesAgencia.map((e, i) => (
            <div key={i} className="border-b border-borde py-2 text-sm last:border-0">
              <p><strong>{e.calificacion}/10</strong> · semana del {e.semana}{e.nota ? ` — ${e.nota}` : ''}</p>
            </div>
          ))
        )}
      </Seccion>

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

function Kpi({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-borde p-2 text-center">
      <p className="text-lg font-bold text-[#17323b]">{valor}</p>
      <p className="text-[10px] text-texto-suave">{label}</p>
      {sub && <p className="text-[9px] text-texto-suave">{sub}</p>}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-1 border-b-2 border-[#f0d6d5] pb-1 text-sm font-semibold text-[#17323b]">{titulo}</h2>
      {children}
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="py-2 text-xs text-texto-suave">{texto}</p>;
}
