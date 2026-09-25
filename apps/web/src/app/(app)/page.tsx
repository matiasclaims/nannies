'use client';

import { useCallback, useEffect, useState, type ElementType, type ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, TrendingUp, MapPin, XCircle, Activity, PieChart, Package, Star, Maximize2, X, Plus, UserPlus, Users, FileText, AlertCircle, type LucideIcon } from 'lucide-react';
import { api, type Dashboard, type MiPanorama, type TipoServicio } from '@/lib/api';
import { ESTADO_SERVICIO, TIPO_LABEL } from '@/lib/dominio';
import { RANGO_LABEL, NIVEL_LABEL } from '@/lib/nannie-ui';
import { Avatar } from '@/components/avatar';
import { useModoPerfil } from '@/lib/modo-perfil';
import { cn } from '@/lib/utils';

const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

export default function PanoramaPage() {
  const { sesion, rolEfectivo } = useModoPerfil();

  // La nannie ve SU panorama personal; coordinación ve el dashboard de negocio.
  // Con doble perfil (Jacky), manda el rol efectivo del modo activo.
  if (rolEfectivo === 'NANNIE') {
    return <PanoramaNannie nombre={sesion?.nombre ?? ''} />;
  }
  return <PanoramaCoordinacion nombre={sesion?.nombre} />;
}

function PanoramaCoordinacion({ nombre }: { nombre?: string }) {
  const hoy = fechaHoy();
  const [d, setD] = useState<Dashboard | null>(null);
  const [expandir, setExpandir] = useState<{ titulo: string; datos: Dashboard['serviciosPorNannie'] } | null>(null);
  const [resolver, setResolver] = useState<Dashboard['adeudosPorDefinir'][number] | null>(null);

  const cargar = useCallback(() => {
    api.dashboard().then(setD).catch(() => undefined);
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const nanniesTol = (d?.serviciosPorNannie ?? []).filter((n) => n.plaza === 'TOLUCA');
  const nanniesQro = (d?.serviciosPorNannie ?? []).filter((n) => n.plaza === 'QUERETARO');

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero delgado + 3 números clave del día */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-marca-azul to-[#3ad0e8] p-5 text-white shadow-card">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Hola, {nombre ?? '…'}</h1>
          <p className="text-sm capitalize text-white/90">{hoy}</p>
        </div>
        <div className="flex gap-2">
          <BadgePorAsignar valor={d?.servicios.porAsignar} lista={d?.porAsignarLista} />
          <HeroBadge valor={d?.cobertura.sinCobertura} label="sin cubrir" href="/asignacion" tip="Servicios vigentes sin nannie asignada. Clic para asignar." />
        </div>
      </section>

      {/* Acciones rápidas (atajos de coordinación) */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <AccionRapida href="/asignacion" icon={Plus} label="Nuevo servicio" />
        <AccionRapida href="/familias" icon={UserPlus} label="Nueva familia" />
        <AccionRapida href="/nannies" icon={Users} label="Agregar nannie" />
        <AccionRapida href="/hoy" icon={CalendarDays} label="Calendario de hoy" />
        <AccionRapida href="/reportes" icon={FileText} label="Reportes" />
      </section>

      {/* Horas del mes por nannie, separado por ciudad (chiquitas, expandibles) */}
      <section className="grid gap-4 sm:grid-cols-2">
        <PanelDona titulo="Horas · Toluca" datos={nanniesTol} cargando={!d} onExpandir={() => setExpandir({ titulo: 'Horas del mes · Toluca', datos: nanniesTol })} />
        <PanelDona titulo="Horas · Querétaro" datos={nanniesQro} cargando={!d} onExpandir={() => setExpandir({ titulo: 'Horas del mes · Querétaro', datos: nanniesQro })} />
      </section>

      {/* Anillos: aceptación, cobertura, horas */}
      <section className="grid grid-cols-3 gap-4">
        <Tarjeta href="/calendario" tip="% de ofertas que las nannies aceptaron este mes. Clic para ver ofertas en el calendario.">
          <RingGauge value={d?.aceptacion.global ?? null} label="Aceptación" sub={d ? `${d.aceptacion.respondidas} ofertas` : ''} color="#9DCD5A" />
        </Tarjeta>
        <Tarjeta href="/asignacion" tip="% de servicios con nannie asignada. Clic para asignar los pendientes.">
          <RingGauge value={d?.cobertura.porcentaje ?? null} label="Cobertura" sub={d ? `${d.cobertura.sinCobertura} sin cubrir` : ''} color="#0CC0DF" />
        </Tarjeta>
        <Tarjeta href="/finanzas" tip="Horas pagadas del mes (paquetes + individuales). Rango objetivo 400-800 h. Clic para ir a Finanzas.">
          <HorasIndicador horas={d?.horasPagadas ?? null} />
        </Tarjeta>
      </section>

      {/* Dinero + paquetes: ingreso no capturado + margen (Directora) + paquetes activos */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CardMoney href="/finanzas" tip="Cobro perdido por cancelaciones sin cargo (aviso tardío). Clic para ver Finanzas." titulo="Ingreso no capturado" valor={d ? money(d.ingresoNoCapturado) : '—'} nota={d ? `${d.cancelaciones.total} canceladas · ${d.cancelaciones.noCobradas} sin cobro` : 'cancelaciones sin cobro'} color="rosa" icon={XCircle} />
        {d?.margen != null ? (
          <CardMoney href="/finanzas" tip="Margen del mes: cobro − pago − comisión − descuentos. Solo tú lo ves. Clic para el detalle en Finanzas." titulo="Margen del mes" valor={money(d.margen)} nota="solo tú lo ves" color="verde" icon={TrendingUp} />
        ) : (
          <CardMoney href="/calendario" tip="Total de servicios vigentes del mes. Clic para ver el calendario." titulo="Servicios del mes" valor={String(d?.servicios.total ?? '—')} nota={`${d?.servicios.completados ?? 0} completados`} color="azul" icon={Activity} />
        )}
        <CardMoney href="/familias?paquete=activos" tip="Familias con un paquete de horas vigente. Clic para ver la lista." titulo="Paquetes activos" valor={String(d?.paquetesActivos ?? '—')} nota="familias con saldo" color="morado" icon={Package} />
      </section>

      {/* Alerta: paquetes por agotarse (≤5 h o ≥80% consumido) → ofrecer renovación */}
      <Panel titulo={`Paquetes por agotarse${d && d.paquetesPorAgotarse.length ? ` (${d.paquetesPorAgotarse.length})` : ''}`} icon={Package}>
        {d && d.paquetesPorAgotarse.length > 0 ? (
          <div className="divide-y divide-borde">
            {d.paquetesPorAgotarse.map((p) => (
              <Interactivo
                key={p.paqueteId}
                href={`/familias/${p.familiaId}`}
                tip={`${p.familia}: quedan ${p.restantes} h de ${p.horasTotales} (${p.consumidoPct}% consumido). Clic para abrir la familia.`}
                className="flex items-center gap-2 rounded-lg px-1.5 py-2 text-xs hover:bg-fondo"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-texto-fuerte">{p.familia}</span>
                <span className="shrink-0 font-semibold text-marca-rojo">
                  {p.restantes} h <span className="font-normal text-texto-suave">de {p.horasTotales}</span>
                </span>
                <span className="w-24 shrink-0">
                  <span className="block h-1.5 rounded-full bg-borde">
                    <span className="block h-1.5 rounded-full bg-marca-rojo" style={{ width: `${Math.min(100, p.consumidoPct)}%` }} />
                  </span>
                </span>
                <span className="w-10 shrink-0 text-right text-texto-suave">{p.consumidoPct}%</span>
              </Interactivo>
            ))}
          </div>
        ) : (
          <Vacio texto={d ? 'Ningún paquete por agotarse.' : 'Cargando…'} />
        )}
      </Panel>

      {/* Alerta: adeudos por definir (horas de desborde de paquete sin facturar) */}
      <Panel titulo={`Adeudos por definir${d && d.adeudosPorDefinir.length ? ` (${d.adeudosPorDefinir.length})` : ''}`} icon={AlertCircle}>
        {d && d.adeudosPorDefinir.length > 0 ? (
          <div className="divide-y divide-borde">
            {d.adeudosPorDefinir.map((a) => (
              <div key={a.servicioId} className="flex items-center gap-2 px-1.5 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  <Link href={`/familias/${a.familiaId}`} className="font-medium text-texto-fuerte hover:text-marca-azul hover:underline">
                    {a.familia}
                  </Link>
                  <span className="text-texto-suave"> · {a.fecha} · {a.horaInicio}–{a.horaFin} · {a.nannie}</span>
                </span>
                <span className="shrink-0 font-semibold text-marca-rojo">{a.horas} h</span>
                <button
                  onClick={() => setResolver(a)}
                  className="shrink-0 rounded-lg bg-marca-azul px-2.5 py-1 font-semibold text-white transition hover:brightness-95"
                >
                  Resolver
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Vacio texto={d ? 'Sin adeudos por definir.' : 'Cargando…'} />
        )}
      </Panel>

      {/* Mañana (para preparar el día) + actividad reciente */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Mañana" icon={CalendarDays}>
          {d && d.manana.length > 0 ? (
            <div className="divide-y divide-borde">
              {d.manana.map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                  <span className="w-12 shrink-0 font-semibold text-texto-fuerte">{s.horaInicio}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className={s.porAsignar ? 'font-semibold text-marca-rojo' : 'text-texto-fuerte'}>{s.nannie}</span>
                    <span className="text-texto-suave"> · {s.familia} · {s.zona}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Vacio texto={d ? 'Sin servicios mañana.' : 'Cargando…'} />
          )}
        </Panel>

        <Panel titulo="Actividad reciente" icon={Activity}>
          {d && d.actividad.length > 0 ? (
            <div>
              {d.actividad.map((a, i) => (
                <Interactivo
                  key={i}
                  href={`/familias/${a.familiaId}`}
                  tip={`${a.familia} · ${a.nannie} · ${ESTADO_SERVICIO[a.estado].label} (${a.fecha}). Clic para abrir la familia.`}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs hover:bg-fondo"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorEstado(a.estado) }} />
                  <span className="min-w-0 flex-1 truncate text-texto-fuerte">
                    {a.familia} · <span className="text-texto-suave">{a.nannie}</span>
                  </span>
                  <span className="shrink-0 text-texto-suave">{ESTADO_SERVICIO[a.estado].label}</span>
                </Interactivo>
              ))}
            </div>
          ) : (
            <Vacio texto={d ? 'Sin actividad reciente.' : 'Cargando…'} />
          )}
        </Panel>
      </section>

      {/* Servicio más demandado + comparativo anual */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Servicio más demandado del mes" icon={Activity}>
          {d && d.serviciosPorTipo.length > 0 ? <BarrasTipo datos={d.serviciosPorTipo} /> : <Vacio texto={d ? 'Sin servicios este mes.' : 'Cargando…'} />}
        </Panel>
        <Panel titulo="Comparativo anual (horas de este mes)" icon={TrendingUp}>
          {d ? <BarrasAnio datos={d.comparativoAnual} /> : <Vacio texto="Cargando…" />}
        </Panel>
      </section>

      {/* Horas cubiertas por mes, una línea por año (comparativo interanual) */}
      <section>
        <Panel titulo="Horas cubiertas por mes (comparativo por año)" icon={Activity}>
          {d ? <LineasMensuales data={d.comparativoMensual} /> : <Vacio texto="Cargando…" />}
        </Panel>
      </section>

      {/* Barras: zonas + aceptación por nannie */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Zonas de más demanda" icon={MapPin}>
          {d && d.zonasDemanda.length > 0 ? <BarrasZonas datos={d.zonasDemanda} /> : <Vacio texto={d ? 'Sin servicios este mes.' : 'Cargando…'} />}
        </Panel>
        <Panel titulo="Aceptación por nannie" icon={TrendingUp}>
          {d && d.aceptacion.porNannie.length > 0 ? (
            <div className="space-y-1">
              {d.aceptacion.porNannie.map((n) => (
                <Interactivo
                  key={n.nannieId}
                  href={`/nannies/${n.nannieId}`}
                  tip={`${n.nombre} aceptó ${n.tasa}% de ${n.ofertas} ${n.ofertas === 1 ? 'oferta' : 'ofertas'} este mes. Clic para su ficha.`}
                  className="block rounded-lg p-1.5 text-sm hover:bg-fondo"
                >
                  <div className="mb-0.5 flex justify-between">
                    <span className="truncate text-texto-fuerte">{n.nombre}</span>
                    <span className="text-xs text-texto-suave">{n.tasa}% · {n.ofertas}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-fondo">
                    <div className="h-full rounded-full" style={{ width: `${n.tasa}%`, backgroundColor: n.tasa < 60 ? '#FF5757' : '#9DCD5A' }} />
                  </div>
                </Interactivo>
              ))}
            </div>
          ) : (
            <Vacio texto={d ? 'Sin ofertas respondidas este mes.' : 'Cargando…'} />
          )}
        </Panel>
      </section>

      {expandir && <ModalDona titulo={expandir.titulo} datos={expandir.datos} onCerrar={() => setExpandir(null)} />}
      {resolver && (
        <ModalResolverAdeudo adeudo={resolver} onCerrar={() => setResolver(null)} onResuelto={() => { setResolver(null); cargar(); }} />
      )}
    </div>
  );
}

/** Modal para resolver un adeudo por definir: cobrarlo individual o pasarlo a un
 *  paquete nuevo. Al resolver, refresca el dashboard. */
function ModalResolverAdeudo({
  adeudo,
  onCerrar,
  onResuelto,
}: {
  adeudo: Dashboard['adeudosPorDefinir'][number];
  onCerrar: () => void;
  onResuelto: () => void;
}) {
  const [modo, setModo] = useState<'INDIVIDUAL' | 'PAQUETE_NUEVO'>('INDIVIDUAL');
  const [cobro, setCobro] = useState('');
  const [paqueteHoras, setPaqueteHoras] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    setError('');
    if (modo === 'INDIVIDUAL' && (!cobro || Number(cobro) <= 0)) {
      return setError('Indica el cobro de las horas.');
    }
    setBusy(true);
    try {
      await api.resolverDesborde(
        adeudo.servicioId,
        modo === 'INDIVIDUAL'
          ? { modo: 'INDIVIDUAL', cobro: Number(cobro) }
          : { modo: 'PAQUETE_NUEVO', paqueteHoras },
      );
      onResuelto();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo resolver.');
    } finally {
      setBusy(false);
    }
  }

  const radio = 'flex items-start gap-2 rounded-xl border p-3 text-left text-sm cursor-pointer transition';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-texto-fuerte">Resolver adeudo</h2>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-texto-suave">
          <strong>{adeudo.familia}</strong> · {adeudo.fecha} · {adeudo.horas} h de desborde ({adeudo.nannie}). ¿Cómo se
          cobran estas horas?
        </p>

        <div className="space-y-2">
          <label className={cn(radio, modo === 'INDIVIDUAL' ? 'border-marca-azul bg-marca-azul/5' : 'border-borde')}>
            <input type="radio" checked={modo === 'INDIVIDUAL'} onChange={() => setModo('INDIVIDUAL')} className="mt-0.5" />
            <span className="flex-1">
              <span className="font-medium text-texto-fuerte">Cobrar como horas individuales</span>
              <span className="block text-xs text-texto-suave">Se factura al monto que captures.</span>
              {modo === 'INDIVIDUAL' && (
                <span className="mt-2 flex items-center gap-1">
                  <span className="text-texto-suave">$</span>
                  <input
                    type="number"
                    min={1}
                    value={cobro}
                    onChange={(e) => setCobro(e.target.value)}
                    placeholder={`Cobro por las ${adeudo.horas} h`}
                    className="w-full rounded-lg border border-borde px-2 py-1 text-sm outline-none focus:border-marca-azul"
                  />
                </span>
              )}
            </span>
          </label>

          <label className={cn(radio, modo === 'PAQUETE_NUEVO' ? 'border-marca-azul bg-marca-azul/5' : 'border-borde')}>
            <input type="radio" checked={modo === 'PAQUETE_NUEVO'} onChange={() => setModo('PAQUETE_NUEVO')} className="mt-0.5" />
            <span className="flex-1">
              <span className="font-medium text-texto-fuerte">Pasar a un paquete nuevo</span>
              <span className="block text-xs text-texto-suave">Crea un paquete y descuenta de él estas horas.</span>
              {modo === 'PAQUETE_NUEVO' && (
                <select
                  value={paqueteHoras}
                  onChange={(e) => setPaqueteHoras(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-borde px-2 py-1 text-sm outline-none focus:border-marca-azul"
                >
                  {[10, 20, 30, 40, 50].map((h) => (
                    <option key={h} value={h}>Paquete de {h} h</option>
                  ))}
                </select>
              )}
            </span>
          </label>
        </div>

        {error && <p className="mt-2 text-xs text-marca-rojo">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCerrar} className="rounded-lg border border-borde px-3 py-1.5 text-sm font-medium text-texto-suave hover:bg-fondo">
            Cancelar
          </button>
          <button onClick={guardar} disabled={busy} className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Resolviendo…' : 'Resolver'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Envuelve cualquier dato del dashboard: tooltip al pasar (qué es) + clic que
 *  navega a su sección (ver/accionar). `abajo` pone el tooltip debajo. */
function Interactivo({ href, tip, className, abajo, children }: { href: string; tip: string; className?: string; abajo?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={cn('group relative cursor-pointer transition', className)}>
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 z-30 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-[#17323b] px-2.5 py-1.5 text-center text-[11px] font-normal leading-snug text-white shadow-lg group-hover:block',
          abajo ? 'top-full mt-2' : 'bottom-full mb-2',
        )}
      >
        {tip}
      </span>
    </Link>
  );
}

function HeroBadge({ valor, label, href, tip }: { valor?: number; label: string; href: string; tip: string }) {
  return (
    <Interactivo href={href} tip={tip} abajo className="rounded-xl bg-white/15 px-3 py-1.5 text-center hover:bg-white/25">
      <p className="text-lg font-bold leading-none">{valor ?? '—'}</p>
      <p className="text-[10px] text-white/80">{label}</p>
    </Interactivo>
  );
}

/** Badge "por asignar": en vez de llevar a un formulario en blanco, despliega
 *  la lista de servicios sin nannie (dice CUÁL) y cada uno lleva al calendario
 *  de esa semana para asignarlo. */
function BadgePorAsignar({ valor, lista }: { valor?: number; lista?: Dashboard['porAsignarLista'] }) {
  const [abierto, setAbierto] = useState(false);
  const items = lista ?? [];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="rounded-xl bg-white/15 px-3 py-1.5 text-center transition hover:bg-white/25"
        aria-expanded={abierto}
      >
        <p className="text-lg font-bold leading-none">{valor ?? '—'}</p>
        <p className="text-[10px] text-white/80">por asignar</p>
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[85vw] rounded-xl bg-panel p-2 text-left shadow-lg ring-1 ring-borde">
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-texto-suave">
              Servicios por asignar
            </p>
            {items.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-texto-suave">Nada pendiente por asignar.</p>
            ) : (
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {items.map((s) => (
                  <li key={s.servicioId}>
                    <Link
                      href={`/calendario?fecha=${s.fecha}`}
                      onClick={() => setAbierto(false)}
                      className="block rounded-lg px-2 py-1.5 hover:bg-fondo"
                    >
                      <p className="text-sm font-medium text-texto-fuerte">{s.familia}</p>
                      <p className="text-[11px] text-texto-suave">
                        {fechaCorta(s.fecha)} · {s.horaInicio} · {TIPO_LABEL[s.tipoServicio]}
                        {s.zona ? ` · ${s.zona}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Tarjeta-visual clickable con tooltip. */
function Tarjeta({ href, tip, children }: { href: string; tip: string; children: ReactNode }) {
  return (
    <Interactivo href={href} tip={tip} className="flex flex-col items-center justify-center rounded-2xl bg-panel p-4 text-center shadow-card hover:-translate-y-0.5 hover:shadow-lg">
      {children}
    </Interactivo>
  );
}

/** Atajo del dashboard: botón con ícono que lleva a una sección. */
function AccionRapida({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-2xl bg-panel px-3 py-3 text-sm font-medium text-texto-fuerte shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-marca-azul/10 text-marca-azul">
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Anillo de progreso (SVG, sin librería). value 0-100 o null. */
function RingGauge({ value, label, sub, color }: { value: number | null; label: string; sub?: string; color: string }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, value ?? 0)) / 100);
  return (
    <>
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 76 76" className="h-24 w-24 -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="#E6EDF5" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-texto-fuerte">{value == null ? '—' : `${value}%`}</span>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold text-texto-fuerte">{label}</p>
      {sub && <p className="text-[11px] text-texto-suave">{sub}</p>}
    </>
  );
}

/** Dona (conic-gradient) del reparto de servicios del mes por nannie. Cada
 *  rebanada usa el color de la nannie; la leyenda es clickable a su ficha. */
function DonutPorNannie({ datos, grande }: { datos: Dashboard['serviciosPorNannie']; grande?: boolean }) {
  const PALETA = ['#0CC0DF', '#9DCD5A', '#CB6CE6', '#FF66C4', '#FF5757', '#F97316', '#1971C2', '#7048E8', '#0B7285', '#E8590C'];
  const items = datos.map((n, i) => ({ ...n, c: n.color || PALETA[i % PALETA.length] }));
  const total = items.reduce((s, x) => s + x.total, 0);
  let acc = 0;
  const stops = total
    ? items
        .map((x) => {
          const from = (acc / total) * 100;
          acc += x.total;
          return `${x.c} ${from}% ${(acc / total) * 100}%`;
        })
        .join(', ')
    : '';
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div className={`relative ${grande ? 'h-44 w-44' : 'h-28 w-28'} shrink-0 rounded-full`} style={{ background: total ? `conic-gradient(${stops})` : '#E6EDF5' }}>
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-panel">
          <span className={`${grande ? 'text-3xl' : 'text-2xl'} font-bold text-texto-fuerte`}>{total}</span>
          <span className="text-[10px] text-texto-suave">horas</span>
        </div>
      </div>
      <div className={`grid w-full flex-1 grid-cols-1 gap-0.5 ${grande ? '' : 'sm:grid-cols-2'}`}>
        {items.map((x) => (
          <Interactivo
            key={x.nannieId}
            href={`/nannies/${x.nannieId}`}
            tip={`${x.nombre}: ${x.total} ${x.total === 1 ? 'hora' : 'horas'} este mes. Clic para su ficha.`}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-fondo"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: x.c }} />
            <span className="min-w-0 flex-1 truncate text-texto-fuerte">{x.nombre}</span>
            <span className="shrink-0 text-xs font-semibold text-texto-suave">{x.total} h</span>
          </Interactivo>
        ))}
      </div>
    </div>
  );
}

/** Panel de dona por ciudad, chiquito, con botón para ampliar. */
function PanelDona({ titulo, datos, cargando, onExpandir }: { titulo: string; datos: Dashboard['serviciosPorNannie']; cargando: boolean; onExpandir: () => void }) {
  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-texto-fuerte">
          <PieChart className="h-4 w-4 text-marca-azul" /> {titulo}
        </p>
        <button onClick={onExpandir} className="rounded-lg p-1 text-texto-suave hover:bg-fondo" title="Ampliar">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      {cargando ? <Vacio texto="Cargando…" /> : datos.length > 0 ? <DonutPorNannie datos={datos} /> : <Vacio texto="Sin servicios este mes." />}
    </div>
  );
}

/** Modal con la dona ampliada. */
function ModalDona({ titulo, datos, onCerrar }: { titulo: string; datos: Dashboard['serviciosPorNannie']; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-panel p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-texto-fuerte">{titulo}</h2>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte">
            <X className="h-5 w-5" />
          </button>
        </div>
        {datos.length > 0 ? <DonutPorNannie datos={datos} grande /> : <Vacio texto="Sin servicios este mes." />}
      </div>
    </div>
  );
}

/** Líneas superpuestas: horas cubiertas por mes, una serie por año, con selector
 *  de plaza (Todas/Toluca/Querétaro). SVG puro, sin librería. */
function LineasMensuales({ data }: { data: Dashboard['comparativoMensual'] }) {
  const [plaza, setPlaza] = useState<'total' | 'toluca' | 'queretaro'>('total');
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  // Más viejo → más nuevo: gris, verde, azul (el año en curso resalta en azul).
  const COLORES = ['#B9C2CF', '#9DCD5A', '#1971C2'];

  const series = data.series.map((s) => ({ anio: s.anio, valores: s[plaza] }));
  const maxDato = Math.max(1, ...series.flatMap((s) => s.valores));
  const paso = pasoBonito(maxDato);
  const maxY = Math.max(paso, Math.ceil(maxDato / paso) * paso);
  const yticks: number[] = [];
  for (let t = 0; t <= maxY + 0.001; t += paso) yticks.push(Math.round(t));

  const W = 640, H = 240, padL = 40, padR = 12, padT = 12, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i: number) => padL + (iw * i) / 11;
  const yv = (v: number) => padT + ih - (ih * v) / maxY;

  const btn = (k: typeof plaza, l: string) => (
    <button
      key={k}
      onClick={() => setPlaza(k)}
      className={cn(
        'rounded-lg px-3 py-1 text-xs font-medium transition',
        plaza === k ? 'bg-marca-azul text-white' : 'bg-fondo text-texto-suave hover:text-texto-fuerte',
      )}
    >
      {l}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {btn('total', 'Todas')}
        {btn('toluca', 'Toluca')}
        {btn('queretaro', 'Querétaro')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Horas cubiertas por mes por año">
        {yticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={yv(t)} y2={yv(t)} stroke="#eef0f2" strokeWidth="1" />
            <text x={padL - 6} y={yv(t) + 3} textAnchor="end" fontSize="9" fill="#9aa4b2">{t}</text>
          </g>
        ))}
        {MESES.map((mm, i) => (
          <text key={mm} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#9aa4b2">{mm}</text>
        ))}
        {series.map((s, si) => {
          const color = COLORES[si] ?? '#CB6CE6';
          const pts = s.valores.map((v, i) => `${x(i)},${yv(v)}`).join(' ');
          return (
            <g key={s.anio}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {s.valores.map((v, i) =>
                v > 0 ? (
                  <circle key={i} cx={x(i)} cy={yv(v)} r="2.5" fill={color}>
                    <title>{`${s.anio} · ${MESES_LARGO[i]}: ${v} h`}</title>
                  </circle>
                ) : null,
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        {series.map((s, si) => (
          <span key={s.anio} className="flex items-center gap-1.5 text-xs text-texto-suave">
            <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: COLORES[si] ?? '#CB6CE6' }} />
            {s.anio}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Paso "bonito" para el eje Y (1/2/5 × 10^n) según el máximo del dato. */
function pasoBonito(max: number): number {
  const bruto = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto || 1)));
  const norm = bruto / mag;
  const paso = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return Math.max(1, paso * mag);
}

/** Barras horizontales de servicios por tipo (el más demandado arriba). */
function BarrasTipo({ datos }: { datos: { tipo: TipoServicio; total: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <div className="space-y-2">
      {datos.map((t) => (
        <div key={t.tipo} className="text-sm">
          <div className="mb-0.5 flex justify-between">
            <span className="truncate text-texto-fuerte">{TIPO_LABEL[t.tipo]}</span>
            <span className="text-xs text-texto-suave">{t.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-fondo">
            <div className="h-full rounded-full bg-marca-azul" style={{ width: `${(t.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Barras verticales del comparativo anual (horas del mes en los últimos años). */
function BarrasAnio({ datos }: { datos: { anio: number; horas: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.horas));
  return (
    <div className="flex h-40 items-end gap-3 pt-2">
      {datos.map((a) => (
        <div key={a.anio} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold text-texto-fuerte">{a.horas > 0 ? a.horas : ''}</span>
          <div className="w-full max-w-[56px] rounded-t bg-marca-morado" style={{ height: `${(a.horas / max) * 100}%`, minHeight: a.horas > 0 ? 6 : 0 }} />
          <span className="text-[11px] text-texto-suave">{a.anio}</span>
        </div>
      ))}
    </div>
  );
}

/** Indicador de horas pagadas del mes (movido de Finanzas): anillo con color
 *  por rango — <400 naranja, 400-800 azul, >800 verde limón. Tope visual 800. */
function HorasIndicador({ horas }: { horas: number | null }) {
  const h = horas ?? 0;
  const rango = h < 400 ? { color: '#F97316', label: 'Bajo' } : h <= 800 ? { color: '#0CC0DF', label: 'En rango' } : { color: '#9DCD5A', label: 'Óptimo' };
  const r = 32;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, (h / 800) * 100) / 100);
  return (
    <>
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 76 76" className="h-24 w-24 -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="#E6EDF5" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={rango.color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-texto-fuerte">{horas == null ? '—' : h}</span>
          <span className="text-[9px] text-texto-suave">horas</span>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold text-texto-fuerte">Horas pagadas</p>
      <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: rango.color }}>{rango.label}</span>
    </>
  );
}

function CardMoney({ href, tip, titulo, valor, nota, color, icon: Icon }: { href: string; tip: string; titulo: string; valor: string; nota: string; color: 'rosa' | 'verde' | 'azul' | 'morado'; icon: ElementType }) {
  const tint = { rosa: 'text-marca-rosa', verde: 'text-[#3b6d11]', azul: 'text-marca-azul', morado: 'text-marca-morado' }[color];
  const bg = { rosa: 'bg-marca-rosa/10', verde: 'bg-marca-verde/15', azul: 'bg-marca-azul/10', morado: 'bg-marca-morado/10' }[color];
  return (
    <Interactivo href={href} tip={tip} className={`flex items-center gap-4 rounded-2xl ${bg} p-5 shadow-card hover:-translate-y-0.5 hover:shadow-lg`}>
      <Icon className={`h-7 w-7 ${tint}`} />
      <div>
        <p className="text-xs font-medium text-texto-suave">{titulo}</p>
        <p className={`text-2xl font-bold ${tint}`}>{valor}</p>
        <p className="text-[11px] text-texto-suave">{nota}</p>
      </div>
    </Interactivo>
  );
}

function colorEstado(e: Dashboard['actividad'][number]['estado']): string {
  if (e === 'COMPLETADO') return '#9DCD5A';
  if (e === 'CANCELADO' || e === 'RECHAZADO') return '#FF5757';
  if (e === 'OFERTADO') return '#CB6CE6';
  return '#0CC0DF';
}

function Panel({ titulo, icon: Icon, children }: { titulo: string; icon: ElementType; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-texto-fuerte">
        <Icon className="h-4 w-4 text-marca-azul" /> {titulo}
      </p>
      {children}
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="py-4 text-center text-xs text-texto-suave">{texto}</p>;
}

/** Barras horizontales de zonas por nº de servicios (sin librería). Interactivas. */
function BarrasZonas({ datos }: { datos: { zona: string; servicios: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.servicios));
  return (
    <div className="space-y-1">
      {datos.map((z) => (
        <Interactivo
          key={z.zona}
          href="/calendario"
          tip={`${z.servicios} ${z.servicios === 1 ? 'servicio' : 'servicios'} en ${z.zona} este mes. Clic para ver el calendario.`}
          className="block rounded-lg p-1.5 text-sm hover:bg-fondo"
        >
          <div className="mb-0.5 flex justify-between">
            <span className="truncate text-texto-fuerte">{z.zona}</span>
            <span className="text-xs text-texto-suave">{z.servicios}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-fondo">
            <div className="h-full rounded-full bg-marca-azul" style={{ width: `${(z.servicios / max) * 100}%` }} />
          </div>
        </Interactivo>
      ))}
    </div>
  );
}

/** Panorama personal de la nannie: su actividad, sin datos de negocio. */
function PanoramaNannie({ nombre }: { nombre: string }) {
  const [p, setP] = useState<MiPanorama | null>(null);
  const hoy = fechaHoy();

  useEffect(() => {
    api.miPanorama().then(setP).catch(() => undefined);
  }, []);

  const califs: { label: string; v: number }[] = [];
  if (p?.calificacionPapas.promedio != null) califs.push({ label: 'Papás', v: p.calificacionPapas.promedio });
  if (p?.calificacionAgencia.promedio != null) califs.push({ label: 'Agencia', v: p.calificacionAgencia.promedio });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Tarjeta principal: foto + nombre + especialidad + calificación */}
      <section className="rounded-2xl bg-gradient-to-r from-marca-azul to-[#3ad0e8] p-6 text-white shadow-card">
        <div className="flex items-center gap-4">
          <Avatar foto={p?.foto} nombre={p?.nombre || nombre} size={76} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold md:text-2xl">Hola, {p?.nombre || nombre}</h1>
            <p className="text-xs capitalize text-white/85">{hoy}</p>
            {p?.especialidad && <p className="mt-1 line-clamp-2 text-xs text-white/80">{p.especialidad}</p>}
          </div>
        </div>
        {califs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {califs.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5">
                <Star className="h-4 w-4 text-amber-300" fill="currentColor" />
                <span className="text-base font-bold">{c.v}</span>
                <span className="text-[11px] text-white/80">{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ofertas pendientes — GRANDE, en rojo cuando hay */}
      {p && p.ofertas > 0 ? (
        <Link
          href="/calendario"
          className="flex items-center justify-between gap-3 rounded-2xl bg-marca-rojo p-6 text-white shadow-card transition hover:brightness-95"
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold leading-none">{p.ofertas}</span>
            <span className="text-base font-semibold">
              {p.ofertas === 1 ? 'oferta por responder' : 'ofertas por responder'}
              <span className="block text-xs font-normal text-white/85">Toca para verlas y aceptar o rechazar</span>
            </span>
          </div>
          <CalendarDays className="h-7 w-7 shrink-0" />
        </Link>
      ) : (
        <div className="rounded-2xl bg-panel p-5 text-center text-sm text-texto-suave shadow-card">
          No tienes ofertas pendientes por ahora.
        </div>
      )}

      {/* Proyección: sus próximas fechas para ver/descargar (paquetes largos) */}
      <a
        href="/mi-proyeccion"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 rounded-2xl bg-panel p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <span className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-marca-azul" />
          <span>
            <span className="block text-sm font-semibold text-texto-fuerte">Mis próximas fechas</span>
            <span className="block text-xs text-texto-suave">Ver o descargar tu agenda a futuro (PDF)</span>
          </span>
        </span>
        <TrendingUp className="h-5 w-5 shrink-0 text-texto-suave" />
      </a>

      {/* Mis paquetes: avance de los paquetes donde participa (solo los suyos) */}
      <Link
        href="/mis-paquetes"
        className="flex items-center justify-between gap-3 rounded-2xl bg-panel p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <span className="flex items-center gap-3">
          <Package className="h-5 w-5 text-marca-azul" />
          <span>
            <span className="block text-sm font-semibold text-texto-fuerte">Mis paquetes</span>
            <span className="block text-xs text-texto-suave">Avance y sesiones de tus paquetes</span>
          </span>
        </span>
        <TrendingUp className="h-5 w-5 shrink-0 text-texto-suave" />
      </Link>

      {/* Horas del mes + nivel (termómetro) */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-texto-suave">Horas cubiertas este mes</p>
            <p className="text-4xl font-bold text-[#3b6d11]">
              {p?.horasMes ?? '—'} <span className="text-xl">h</span>
            </p>
            <p className="text-xs text-texto-suave">{p?.serviciosMes ?? 0} servicios completados</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-texto-suave">Tu nivel</p>
            <p className="text-lg font-bold text-texto-fuerte">{RANGO_LABEL[p?.rangoPermanente ?? 'BASE'] ?? p?.rangoPermanente}</p>
            <p className="text-[11px] text-texto-suave">este mes: {NIVEL_LABEL[p?.nivelMes ?? 'BASE'] ?? p?.nivelMes}</p>
          </div>
        </div>
        <Termometro horas={p?.horasMes ?? 0} />
      </div>

      {/* Gráficas: horas por semana + histórico por mes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-panel p-4 shadow-card">
          <p className="text-sm font-semibold text-texto-fuerte">Horas por semana</p>
          <p className="mb-3 text-xs text-texto-suave">Últimas 8 semanas</p>
          {p ? <BarrasHoras datos={p.horasPorSemana} /> : <div className="h-32 animate-pulse rounded-xl bg-fondo" />}
        </div>
        <div className="rounded-2xl bg-panel p-4 shadow-card">
          <p className="text-sm font-semibold text-texto-fuerte">Horas por mes</p>
          <p className="mb-3 text-xs text-texto-suave">Últimos 12 meses</p>
          {p ? <BarrasMesHoras datos={p.horasPorMes} /> : <div className="h-32 animate-pulse rounded-xl bg-fondo" />}
        </div>
      </div>

      <Link
        href="/calendario"
        className="flex items-center justify-center gap-2 rounded-2xl bg-marca-azul p-4 text-base font-semibold text-white shadow-card transition hover:brightness-95"
      >
        <CalendarDays className="h-5 w-5" />
        Ir a mi calendario (disponibilidad y ofertas)
      </Link>
    </div>
  );
}

/** Termómetro de horas del mes: rojo → ámbar → verde según se acerca a la meta
 *  (25 h, el umbral mensual para mantener/subir de nivel). */
function Termometro({ horas }: { horas: number }) {
  const meta = 25;
  const pct = Math.min(100, (horas / meta) * 100);
  const color = horas >= meta ? '#2f9e44' : horas >= meta / 2 ? '#f59e0b' : '#e03131';
  return (
    <div className="mt-3">
      <div className="h-3 w-full overflow-hidden rounded-full bg-fondo">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-[11px] text-texto-suave">
        {horas >= meta
          ? '¡Vas muy bien! Con 25 h o más mantienes tu nivel del mes.'
          : `Vas por ${horas} h. Al llegar a ${meta} h en el mes mantienes o subes tu nivel.`}
      </p>
    </div>
  );
}

/** Barras de horas por mes (histórico). */
function BarrasMesHoras({ datos }: { datos: { label: string; horas: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.horas));
  return (
    <div className="flex h-32 items-end gap-1">
      {datos.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[9px] font-medium text-texto-fuerte">{d.horas > 0 ? d.horas : ''}</span>
          <div className="w-full rounded-t bg-marca-verde" style={{ height: `${(d.horas / max) * 100}%`, minHeight: d.horas > 0 ? 4 : 0 }} />
          <span className="text-[8px] capitalize text-texto-suave">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Gráfica de barras de horas por semana (piel "Claro", sin librerías). */
function BarrasHoras({ datos }: { datos: { semana: string; horas: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.horas));
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {datos.map((d, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-medium text-texto-fuerte">
              {d.horas > 0 ? d.horas : ''}
            </span>
            <div
              className="w-full rounded-t bg-marca-azul"
              style={{ height: `${(d.horas / max) * 100}%`, minHeight: d.horas > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {datos.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[9px] leading-tight text-texto-suave">
            {d.semana}
          </span>
        ))}
      </div>
    </div>
  );
}

function fechaHoy(): string {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** ISO "YYYY-MM-DD" → "30 ago" (fecha local, sin corrimiento de zona). */
function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
