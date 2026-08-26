'use client';

import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, Wallet, TrendingUp, MapPin, XCircle, Activity, PieChart, Package } from 'lucide-react';
import { api, type Sesion, type Servicio, type MiReporte, type Dashboard } from '@/lib/api';
import { ESTADO_SERVICIO } from '@/lib/dominio';
import { cn } from '@/lib/utils';

const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

export default function PanoramaPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  // La nannie ve SU panorama personal; coordinación ve el dashboard de negocio.
  if (sesion?.rol === 'NANNIE') {
    return <PanoramaNannie nombre={sesion.nombre} />;
  }
  return <PanoramaCoordinacion nombre={sesion?.nombre} />;
}

function PanoramaCoordinacion({ nombre }: { nombre?: string }) {
  const hoy = fechaHoy();
  const [d, setD] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.dashboard().then(setD).catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero delgado + 3 números clave del día */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-marca-azul to-[#3ad0e8] p-5 text-white shadow-card">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Hola, {nombre ?? '…'}</h1>
          <p className="text-sm capitalize text-white/90">{hoy}</p>
        </div>
        <div className="flex gap-2">
          <HeroBadge valor={d?.servicios.hoy} label="hoy" href="/calendario" tip="Servicios programados para hoy. Clic para ver el calendario." />
          <HeroBadge valor={d?.servicios.porAsignar} label="por asignar" href="/asignacion" tip="Servicios futuros sin nannie. Clic para asignarlos." />
          <HeroBadge valor={d?.cobertura.sinCobertura} label="sin cubrir" href="/asignacion" tip="Servicios vigentes sin nannie asignada. Clic para asignar." />
        </div>
      </section>

      {/* Servicios del mes que lleva cada nannie (dona por nannie) */}
      <Panel titulo="Servicios del mes por nannie" icon={PieChart}>
        {d && d.serviciosPorNannie.length > 0 ? (
          <DonutPorNannie datos={d.serviciosPorNannie} />
        ) : (
          <Vacio texto={d ? 'Sin servicios asignados este mes.' : 'Cargando…'} />
        )}
      </Panel>

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

      {/* Actividad reciente (compacta, con punto de color por estado) */}
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

/** Tarjeta-visual clickable con tooltip. */
function Tarjeta({ href, tip, children }: { href: string; tip: string; children: ReactNode }) {
  return (
    <Interactivo href={href} tip={tip} className="flex flex-col items-center justify-center rounded-2xl bg-panel p-4 text-center shadow-card hover:-translate-y-0.5 hover:shadow-lg">
      {children}
    </Interactivo>
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
function DonutPorNannie({ datos }: { datos: { nannieId: string; nombre: string; color: string | null; total: number }[] }) {
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
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${stops})` : '#E6EDF5' }}>
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-panel">
          <span className="text-2xl font-bold text-texto-fuerte">{total}</span>
          <span className="text-[10px] text-texto-suave">servicios</span>
        </div>
      </div>
      <div className="grid w-full flex-1 grid-cols-1 gap-0.5 sm:grid-cols-2">
        {items.map((x) => (
          <Interactivo
            key={x.nannieId}
            href={`/nannies/${x.nannieId}`}
            tip={`${x.nombre}: ${x.total} ${x.total === 1 ? 'servicio' : 'servicios'} este mes. Clic para su ficha.`}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-fondo"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: x.c }} />
            <span className="min-w-0 flex-1 truncate text-texto-fuerte">{x.nombre}</span>
            <span className="shrink-0 text-xs font-semibold text-texto-suave">{x.total}</span>
          </Interactivo>
        ))}
      </div>
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
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [reporte, setReporte] = useState<MiReporte | null>(null);
  const hoy = fechaHoy();

  useEffect(() => {
    const d = new Date();
    const a = d.getFullYear();
    const m = d.getMonth();
    const mm = String(m + 1).padStart(2, '0');
    const ultimo = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
    api
      .listarServicios({ desde: `${a}-${mm}-01`, hasta: `${a}-${mm}-${String(ultimo).padStart(2, '0')}` })
      .then(setServicios)
      .catch(() => undefined);
    api.miReporte().then(setReporte).catch(() => undefined);
  }, []);

  const ofertas = servicios.filter((s) => s.estado === 'OFERTADO').length;
  const proximos = servicios.filter((s) => s.estado === 'ACEPTADO');
  const completados = servicios.filter((s) => s.estado === 'COMPLETADO');
  const horas = completados.reduce((s, x) => s + x.duracionHoras, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-2xl bg-gradient-to-r from-marca-azul to-[#3ad0e8] p-6 text-white shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold md:text-2xl">Hola, {nombre}</h1>
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs capitalize">{hoy}</span>
        </div>
        <p className="mt-1 text-sm text-white/90">Tu actividad de este mes</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <BannerStat titulo="Ofertas por responder" valor={String(ofertas)} nota="en tu calendario" />
          <BannerStat titulo="Servicios próximos" valor={String(proximos.length)} nota="aceptados" />
          <BannerStat titulo="Servicios del mes" valor={String(completados.length)} nota="completados" />
          <BannerStat titulo="Horas del mes" valor={String(horas)} nota="trabajadas" />
        </div>
      </section>

      {/* Mi reporte (autoservicio): ganancias del mes + horas por semana. Sin
          datos de familias/niños (solo lo suyo). */}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="flex flex-col justify-center rounded-2xl bg-marca-verde/15 p-5 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#5c7a2e]">
            <Wallet className="h-4 w-4" />
            Lo que llevas ganado este mes
          </p>
          <p className="mt-1 text-3xl font-bold text-[#3b6d11]">
            {reporte ? money(reporte.ganadoMes) : '—'}
          </p>
          <p className="mt-1 text-xs text-texto-suave">
            {reporte ? `${reporte.serviciosMes} servicios · ${reporte.horasMes} h` : 'Cargando…'}
          </p>
        </div>

        <div className="rounded-2xl bg-panel p-4 shadow-card">
          <p className="text-sm font-semibold text-texto-fuerte">Horas por semana</p>
          <p className="mb-3 text-xs text-texto-suave">Tus últimas 8 semanas</p>
          {reporte ? (
            <BarrasHoras datos={reporte.horasPorSemana} />
          ) : (
            <div className="h-32 animate-pulse rounded-xl bg-fondo" />
          )}
        </div>
      </div>

      <Link
        href="/calendario"
        className="flex items-center justify-center gap-2 rounded-2xl bg-panel p-4 text-sm font-semibold text-marca-azul shadow-card transition hover:brightness-95"
      >
        <CalendarDays className="h-5 w-5" />
        Ir a mi calendario (disponibilidad y ofertas)
      </Link>
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

function BannerStat({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[11px] text-white/80">{titulo}</p>
      <p className="text-lg font-bold">{valor}</p>
      <p className="text-[11px] text-white/70">{nota}</p>
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
