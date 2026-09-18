'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Package, ChevronRight } from 'lucide-react';
import { api, type Servicio, type NannieLite, type FamiliaLite, type Plaza } from '@/lib/api';
import { ESTADO_SERVICIO, TIPO_LABEL } from '@/lib/dominio';
import { cn } from '@/lib/utils';

/** Fecha de hoy en formato ISO (YYYY-MM-DD), zona local. */
const hoyISO = () => new Date().toLocaleDateString('en-CA');
/** Fecha larga legible ("jueves, 18 de septiembre de 2026"). */
const hoyLargo = () =>
  new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Panorama del DÍA en curso: solo los servicios de hoy (atajo "Calendario de hoy"
 * del Panorama). No es el calendario completo; es el resumen del día para saber,
 * de un vistazo, quién cubre qué y qué queda por asignar.
 */
export default function HoyPage() {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [nannies, setNannies] = useState<NannieLite[]>([]);
  const [familias, setFamilias] = useState<FamiliaLite[]>([]);
  const iso = hoyISO();

  useEffect(() => {
    api.listarServicios({ desde: iso, hasta: iso }).then(setServicios).catch(() => setServicios([]));
    api.listarNannies().then(setNannies).catch(() => undefined);
    api.listarFamilias().then(setFamilias).catch(() => undefined);
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
            Hoy
          </h1>
          <p className="text-sm capitalize text-texto-suave">{hoyLargo()}</p>
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
        <Chip valor={servicios ? total : null} label="servicios hoy" />
        <Chip valor={servicios ? porAsignar : null} label="por asignar" alerta={porAsignar > 0} />
        <Chip valor={servicios ? completados : null} label="completados" />
      </div>

      {servicios === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel shadow-card" />
      ) : relevantes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde bg-panel p-8 text-center text-sm text-texto-suave">
          No hay servicios programados para hoy.
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
                  <ServicioHoy
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
    </div>
  );
}

function ServicioHoy({ servicio: s, nannie, familia }: { servicio: Servicio; nannie?: string; familia: string }) {
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
      <div className={cn('text-2xl font-bold', alerta ? 'text-marca-rojo' : 'text-texto-fuerte')}>
        {valor ?? '—'}
      </div>
      <div className="text-xs text-texto-suave">{label}</div>
    </div>
  );
}
