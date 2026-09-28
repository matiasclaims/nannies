'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { api, ApiError, type ConciliacionMes } from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';

const ESTADO_LABEL: Record<string, string> = {
  OFERTADO: 'Ofertado',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};
const sn = (b: boolean | null) => (b == null ? '' : b ? 'Sí' : 'No');
const money = (n: number | null) => (n == null ? '' : `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);

/** Descarga un CSV (UTF-8 con BOM) que Excel abre directo. */
function descargarCSV(nombre: string, headers: string[], filas: (string | number | boolean | null)[][]) {
  const esc = (v: string | number | boolean | null) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...filas].map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ConciliacionPage() {
  const [desde, setDesde] = useState('2026-09-01');
  const [hasta, setHasta] = useState('2026-09-30');
  const [corte, setCorte] = useState('2026-09-19');
  const [data, setData] = useState<ConciliacionMes | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'prohibido' | 'error'>('cargando');

  const cargar = useCallback(() => {
    setEstado('cargando');
    api
      .conciliacionMes(desde, hasta, corte)
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch((e) => setEstado(e instanceof ApiError && e.status === 403 ? 'prohibido' : 'error'));
  }, [desde, hasta, corte]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function exportarServicios() {
    if (!data) return;
    const headers = [
      'Origen', 'Fecha', 'Tipo', 'Formato', 'Familia', 'Nannie', 'Plaza', 'Zona', 'Dirección específica',
      'Horas', 'Estado', 'Paq. horas totales', 'Paq. consumidas', 'Paq. restantes', 'Paq. manual',
      'Motivo cancelación', '¿Cobrada?', '¿Reporte?', 'Calif. papás', '¿Volvería?', 'Calif. coord.',
      'Cobro', 'Pago', 'Margen', 'Comisión', 'Creado en',
    ];
    const filas = data.servicios.map((s) => [
      s.origen, s.fecha, TIPO_LABEL[s.tipoServicio] ?? s.tipoServicio, s.esPaquete ? 'Paquete' : 'Individual',
      s.familia, s.nannie, s.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca', s.zona, s.direccionEspecifica,
      s.duracionHoras, ESTADO_LABEL[s.estado] ?? s.estado,
      s.paqueteHorasTotales ?? '', s.paqueteHorasConsumidas ?? '', s.paqueteHorasRestantes ?? '', sn(s.paqueteManual),
      s.motivoCancelacion, sn(s.canceladaCobrada), sn(s.tieneReporte),
      s.encuestaCalificacion ?? '', sn(s.volveriaContratar), s.evalCoordCalificacion ?? '',
      s.cobro, s.pago ?? '', s.margen ?? '', s.comision, s.creadoEn.slice(0, 16).replace('T', ' '),
    ]);
    descargarCSV(`conciliacion-servicios-${desde}_a_${hasta}.csv`, headers, filas);
  }

  function exportarIncidencias() {
    if (!data) return;
    const headers = ['Fecha', 'Nannie', 'Regla', 'Situación', 'Estado', 'Registró', 'Nota'];
    const filas = data.incidencias.map((i) => [i.fecha, i.nannie, i.regla, i.situacion, i.estado, i.registradaPor, i.nota]);
    descargarCSV(`conciliacion-incidencias-${desde}_a_${hasta}.csv`, headers, filas);
  }

  const input = 'rounded-lg border border-borde bg-white px-2 py-1.5 text-sm outline-none focus:border-marca-azul';

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-texto-fuerte">Conciliación del mes</h1>
        <p className="text-sm text-texto-suave">
          Servicios del periodo distinguiendo lo que ya estaba al migrar (creado hasta el corte) de lo que se agregó
          después. Para cruzar el sistema contra tus controles externos.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-panel p-4 shadow-card">
        <label className="block text-xs font-medium text-texto-suave">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`mt-1 block ${input}`} />
        </label>
        <label className="block text-xs font-medium text-texto-suave">
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`mt-1 block ${input}`} />
        </label>
        <label className="block text-xs font-medium text-texto-suave">
          Corte (migrado ≤)
          <input type="date" value={corte} onChange={(e) => setCorte(e.target.value)} className={`mt-1 block ${input}`} />
        </label>
        <button
          onClick={cargar}
          className="flex items-center gap-1.5 rounded-lg bg-marca-azul px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
        >
          <RefreshCw className="h-4 w-4" /> Generar
        </button>
        {data && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={exportarServicios}
              className="flex items-center gap-1.5 rounded-lg border border-marca-azul px-3 py-2 text-sm font-semibold text-marca-azul hover:bg-marca-azul/5"
            >
              <Download className="h-4 w-4" /> Servicios (Excel)
            </button>
            <button
              onClick={exportarIncidencias}
              disabled={data.incidencias.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-2 text-sm font-semibold text-texto-suave hover:bg-fondo disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Incidencias ({data.incidencias.length})
            </button>
          </div>
        )}
      </div>

      {estado === 'prohibido' ? (
        <Aviso texto="Este reporte es solo para la Directora (incluye margen)." />
      ) : estado === 'error' ? (
        <Aviso texto="No se pudo cargar. ¿Está arriba la API?" />
      ) : estado === 'cargando' ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel" />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ResumenCard titulo="Ya estaba (migrado)" r={data.totales.migrado} tint="azul" />
            <ResumenCard titulo="Nuevo (agregado después)" r={data.totales.nuevo} tint="verde" />
          </div>

          <div className="overflow-x-auto rounded-2xl bg-panel p-2 shadow-card">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-texto-suave">
                <tr className="border-b border-borde">
                  <th className="px-2 py-2">Origen</th>
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Familia</th>
                  <th className="px-2 py-2">Nannie</th>
                  <th className="px-2 py-2">Zona</th>
                  <th className="px-2 py-2 text-right">Horas</th>
                  <th className="px-2 py-2">Paquete</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2 text-right">Cobro</th>
                  <th className="px-2 py-2 text-right">Pago</th>
                  <th className="px-2 py-2 text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                {data.servicios.map((s, i) => (
                  <tr key={i} className="border-b border-borde/50 last:border-0">
                    <td className="px-2 py-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.origen === 'Migrado' ? 'bg-marca-azul/10 text-marca-azul' : 'bg-marca-verde/20 text-[#5c7a2e]'}`}>
                        {s.origen}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-texto-suave">{s.fecha}</td>
                    <td className="px-2 py-1.5">{TIPO_LABEL[s.tipoServicio] ?? s.tipoServicio}</td>
                    <td className="px-2 py-1.5 font-medium text-texto-fuerte">{s.familia}</td>
                    <td className="px-2 py-1.5">{s.nannie}</td>
                    <td className="px-2 py-1.5 text-texto-suave">{s.zona}</td>
                    <td className="px-2 py-1.5 text-right">{s.duracionHoras}</td>
                    <td className="px-2 py-1.5 text-texto-suave">
                      {s.esPaquete ? `${s.paqueteHorasRestantes ?? '—'}/${s.paqueteHorasTotales ?? '—'} h` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-texto-suave">{ESTADO_LABEL[s.estado] ?? s.estado}</td>
                    <td className="px-2 py-1.5 text-right">{money(s.cobro)}</td>
                    <td className="px-2 py-1.5 text-right">{money(s.pago)}</td>
                    <td className="px-2 py-1.5 text-right">{money(s.margen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.servicios.length === 0 && <p className="p-4 text-center text-sm text-texto-suave">Sin servicios en el periodo.</p>}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ResumenCard({ titulo, r, tint }: { titulo: string; r: { servicios: number; horas: number; cobro: number; pago: number; margen: number }; tint: 'azul' | 'verde' }) {
  return (
    <div className={`rounded-2xl p-4 shadow-card ${tint === 'azul' ? 'bg-marca-azul/5' : 'bg-marca-verde/10'}`}>
      <p className="text-sm font-semibold text-texto-fuerte">{titulo}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-5">
        <Kpi label="Servicios" valor={String(r.servicios)} />
        <Kpi label="Horas" valor={String(r.horas)} />
        <Kpi label="Cobro" valor={money(r.cobro)} />
        <Kpi label="Pago" valor={money(r.pago)} />
        <Kpi label="Margen" valor={money(r.margen)} />
      </div>
    </div>
  );
}
function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-white/70 p-2">
      <p className="text-[10px] text-texto-suave">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-texto-fuerte">{valor}</p>
    </div>
  );
}
function Aviso({ texto }: { texto: string }) {
  return <div className="rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">{texto}</div>;
}
