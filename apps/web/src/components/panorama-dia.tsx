'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Package, ChevronRight, ChevronLeft, NotebookPen, Printer, FileWarning } from 'lucide-react';
import { api, type Servicio, type NannieLite, type FamiliaLite, type Plaza, type ReporteDiaItem } from '@/lib/api';
import { ESTADO_SERVICIO, TIPO_LABEL } from '@/lib/dominio';
import { cn } from '@/lib/utils';

/** Fecha de hoy en ISO (YYYY-MM-DD), zona local. */
export const hoyISO = () => new Date().toLocaleDateString('en-CA');
/** ISO desplazado N días (para moverse día a día). */
const shiftISO = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
};
/** ISO → fecha larga ("jueves, 18 de septiembre de 2026"). */
const fechaLarga = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Panorama de UN día: los servicios de esa fecha (quién cubre qué, qué queda por
 * asignar), separados por plaza. Sirve para el atajo "Calendario de hoy" y para
 * el drilldown al hacer clic en un día del calendario.
 */
export function PanoramaDia({ iso }: { iso: string }) {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [nannies, setNannies] = useState<NannieLite[]>([]);
  const [familias, setFamilias] = useState<FamiliaLite[]>([]);
  const [reportes, setReportes] = useState<ReporteDiaItem[] | null>(null);
  const esHoy = iso === hoyISO();

  useEffect(() => {
    setServicios(null);
    setReportes(null);
    api.listarServicios({ desde: iso, hasta: iso }).then(setServicios).catch(() => setServicios([]));
    api.listarNannies().then(setNannies).catch(() => undefined);
    api.listarFamilias().then(setFamilias).catch(() => undefined);
    // Reportes del día (solo coordinación; si 403, queda en []). Mario 2026-09-22.
    api.reportesDelDia(iso).then(setReportes).catch(() => setReportes([]));
  }, [iso]);

  const nombreNannie = useMemo(() => new Map(nannies.map((n) => [n.id, n.nombre])), [nannies]);
  const nombreFamilia = useMemo(
    () => new Map(familias.map((f) => [f.id, `${f.nombreContacto}${f.apellido ? ' ' + f.apellido : ''}`])),
    [familias],
  );

  const relevantes = (servicios ?? [])
    .filter((s) => s.estado !== 'RECHAZADO')
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const total = relevantes.filter((s) => s.estado !== 'CANCELADO').length;
  const porAsignar = relevantes.filter((s) => !s.nannieId && s.estado === 'OFERTADO').length;
  const completados = relevantes.filter((s) => s.estado === 'COMPLETADO').length;

  const porPlaza = (p: Plaza) => relevantes.filter((s) => s.plaza === p);
  const grupos: { plaza: Plaza; titulo: string; items: Servicio[] }[] = [
    { plaza: 'TOLUCA' as Plaza, titulo: 'Toluca', items: porPlaza('TOLUCA') },
    { plaza: 'QUERETARO' as Plaza, titulo: 'Querétaro', items: porPlaza('QUERETARO') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-texto-fuerte">
            <CalendarDays className="h-5 w-5 text-marca-azul" />
            {esHoy ? 'Hoy' : 'Día'}
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href={`/dia/${shiftISO(iso, -1)}`}
              aria-label="Día anterior"
              className="grid h-6 w-6 place-items-center rounded-lg text-texto-suave transition hover:bg-fondo hover:text-marca-azul"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <p className="text-sm capitalize text-texto-suave">{fechaLarga(iso)}</p>
            <Link
              href={`/dia/${shiftISO(iso, 1)}`}
              aria-label="Día siguiente"
              className="grid h-6 w-6 place-items-center rounded-lg text-texto-suave transition hover:bg-fondo hover:text-marca-azul"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <Link
          href="/calendario"
          className="inline-flex items-center gap-1 rounded-xl border border-borde px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-fondo"
        >
          Ver semana completa <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-3 gap-3">
        <Chip valor={servicios ? total : null} label="servicios" />
        <Chip valor={servicios ? porAsignar : null} label="por asignar" alerta={porAsignar > 0} />
        <Chip valor={servicios ? completados : null} label="completados" />
      </div>

      {servicios === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel shadow-card" />
      ) : relevantes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde bg-panel p-8 text-center text-sm text-texto-suave">
          No hay servicios programados para {esHoy ? 'hoy' : 'este día'}.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <section key={g.plaza} className="space-y-2">
              {grupos.length > 1 && (
                <h2 className="text-xs font-semibold uppercase tracking-wide text-texto-suave">{g.titulo}</h2>
              )}
              <div className="space-y-2">
                {g.items.map((s) => (
                  <ServicioDia
                    key={s.id}
                    servicio={s}
                    nannie={s.nannieId ? nombreNannie.get(s.nannieId) : undefined}
                    familia={nombreFamilia.get(s.familiaId) ?? 'Familia'}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Reportes del día (coordinación): seguimiento + hoja por familia para papás */}
      {reportes && reportes.length > 0 && <ReportesDelDia items={reportes} />}
    </div>
  );
}

/** Sección de reportes del día: cada servicio asignado con su reporte (o
 *  "pendiente"); botón para imprimir/PDF la hoja de esa familia. */
function ReportesDelDia({ items }: { items: ReporteDiaItem[] }) {
  const conReporte = items.filter((i) => i.reporte).length;
  return (
    <section className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-texto-fuerte">
          <NotebookPen className="h-4 w-4 text-marca-azul" /> Reportes del día
        </h2>
        <span className="text-xs text-texto-suave">{conReporte} de {items.length} con reporte</span>
      </div>
      <div className="divide-y divide-borde">
        {items.map((it) => (
          <div key={it.servicioId} className="py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-texto-fuerte">
                  {it.familia}
                  {it.ninos.length > 0 && <span className="font-normal text-texto-suave"> · {it.ninos.join(', ')}</span>}
                </p>
                <p className="text-xs text-texto-suave">
                  {it.horaInicio}–{it.horaFin} · {TIPO_LABEL[it.tipoServicio]} · {it.nannie}
                </p>
              </div>
              {it.reporte ? (
                <a
                  href={`/reporte-servicio/${it.servicioId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-borde px-2 py-1 text-[11px] font-medium text-marca-azul hover:bg-fondo"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
                </a>
              ) : (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <FileWarning className="h-3 w-3" /> Pendiente de reporte
                </span>
              )}
            </div>
            {it.reporte && (
              <div className="mt-1.5 rounded-lg bg-fondo px-3 py-2 text-xs">
                <p className="mb-0.5 font-medium text-texto-fuerte">Ánimo del peque: {it.reporte.animoNino}</p>
                <p className="text-texto-suave"><span className="font-medium text-texto-fuerte">Actividades:</span> {it.reporte.actividades}</p>
                {it.reporte.incidentes && (
                  <p className="mt-0.5 text-texto-suave"><span className="font-medium text-texto-fuerte">Incidentes:</span> {it.reporte.incidentes}</p>
                )}
                {it.reporte.notas && (
                  <p className="mt-0.5 text-texto-suave"><span className="font-medium text-texto-fuerte">Notas:</span> {it.reporte.notas}</p>
                )}
                <p className="mt-1 text-[11px] text-texto-suave">— {it.reporte.autor}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicioDia({ servicio: s, nannie, familia }: { servicio: Servicio; nannie?: string; familia: string }) {
  const cancelado = s.estado === 'CANCELADO';
  return (
    <Link
      href={`/familias/${s.familiaId}`}
      className={cn(
        'flex items-center gap-3 rounded-xl bg-panel p-3 text-sm shadow-card transition hover:bg-fondo',
        cancelado && 'opacity-60',
      )}
    >
      <span className="w-24 shrink-0 font-semibold text-texto-fuerte">
        {s.horaInicio}–{s.horaFin}
      </span>
      <span className="min-w-0 flex-1">
        <span className={nannie ? 'font-medium text-texto-fuerte' : 'font-semibold text-marca-rojo'}>
          {nannie ?? 'Por asignar'}
        </span>
        <span className="text-texto-suave"> · {familia}</span>
        <span className="block truncate text-xs text-texto-suave">
          {s.formato === 'PAQUETE' && (
            <Package className="mr-0.5 inline h-3 w-3 align-[-2px]" aria-label="Paquete" />
          )}
          {TIPO_LABEL[s.tipoServicio]}
          {s.zona ? ` · ${s.zona}` : ''}
        </span>
      </span>
      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO_SERVICIO[s.estado].clase)}>
        {ESTADO_SERVICIO[s.estado].label}
      </span>
    </Link>
  );
}

function Chip({ valor, label, alerta }: { valor: number | null; label: string; alerta?: boolean }) {
  return (
    <div className="rounded-2xl bg-panel p-3 text-center shadow-card">
      <div className={cn('text-2xl font-bold', alerta ? 'text-marca-rojo' : 'text-texto-fuerte')}>{valor ?? '—'}</div>
      <div className="text-xs text-texto-suave">{label}</div>
    </div>
  );
}
