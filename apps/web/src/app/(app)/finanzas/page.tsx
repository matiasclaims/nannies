'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Receipt,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  api,
  ApiError,
  type Ingresos,
  type Nomina,
  type Margen,
  type Niveles,
  type NannieLite,
  type Sesion,
} from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { inicioSemana, sumarSemanas, rangoSemana, etiquetaSemana } from '@/lib/semana';
import { Avatar } from '@/components/avatar';
import { cn } from '@/lib/utils';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const NIVEL_LABEL: Record<string, string> = {
  BASE: 'Base',
  TARIFA_25HRS: '25 hrs',
  ROOKIE: 'Rookie',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
};

// Color por nivel (paleta de marca, sin rojo). Progresión: gris → azul →
// verde → morado → rosa a medida que sube el nivel.
const NIVEL_CLASE: Record<string, string> = {
  BASE: 'bg-slate-100 text-slate-600',
  TARIFA_25HRS: 'bg-marca-azul/15 text-marca-azul',
  ROOKIE: 'bg-marca-verde/25 text-[#5c7a2e]',
  JUNIOR: 'bg-marca-morado/15 text-marca-morado',
  SENIOR: 'bg-marca-rosa/15 text-marca-rosa',
};
const nivelClase = (nivel: string) => NIVEL_CLASE[nivel] ?? 'bg-marca-azul/10 text-marca-azul';

const RANGO_LABEL: Record<string, string> = {
  BASE: 'Base',
  ROOKIE: 'Rookie',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
};

const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

function rangoMes(anio: number, mes: number): { desde: string; hasta: string } {
  const mm = String(mes + 1).padStart(2, '0');
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${String(ultimo).padStart(2, '0')}` };
}

const PESTANAS = [
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'nomina', label: 'Nómina' },
  { id: 'margen', label: 'Margen' },
  { id: 'niveles', label: 'Niveles' },
] as const;
type TabId = (typeof PESTANAS)[number]['id'];

export default function FinanzasPage() {
  const hoy = new Date();
  const [tab, setTab] = useState<TabId>('ingresos');
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()));
  const [ingresos, setIngresos] = useState<Ingresos | null>(null);
  const [nomina, setNomina] = useState<Nomina | null>(null);
  const [margen, setMargen] = useState<Margen | null>(null);
  const [niveles, setNiveles] = useState<Niveles | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [nannies, setNannies] = useState<NannieLite[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error' | 'prohibido'>('cargando');

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      if (tab === 'nomina') {
        const { desde, hasta } = rangoSemana(semana);
        setNomina(await api.nomina(desde, hasta));
      } else if (tab === 'niveles') {
        setNiveles(await api.niveles());
      } else {
        const { desde, hasta } = rangoMes(anio, mes);
        if (tab === 'ingresos') setIngresos(await api.ingresos(desde, hasta));
        else setMargen(await api.margen(desde, hasta));
      }
      setEstado('ok');
    } catch (err) {
      setEstado(err instanceof ApiError && err.status === 403 ? 'prohibido' : 'error');
    }
  }, [tab, anio, mes, semana]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
    api.listarNannies().then(setNannies).catch(() => undefined);
  }, []);

  // Reload ligero de niveles (sin ciclo 'cargando'): evita desmontar la vista
  // y perder el resumen del cierre recién ejecutado.
  const recargarNiveles = useCallback(async () => {
    setNiveles(await api.niveles().catch(() => null));
  }, []);

  function cambiarMes(delta: number) {
    const d = new Date(Date.UTC(anio, mes + delta, 1));
    setAnio(d.getUTCFullYear());
    setMes(d.getUTCMonth());
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-texto-fuerte">Finanzas</h1>
        <p className="text-sm text-texto-suave">Ingresos, nómina y margen de la operación.</p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 border-b border-borde">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setTab(p.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition',
              tab === p.id
                ? 'border-marca-azul text-marca-azul'
                : 'border-transparent text-texto-suave hover:text-texto-fuerte',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Navegador de periodo (mes para ingresos/margen, semana para nómina) */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => (tab === 'nomina' ? setSemana((s) => sumarSemanas(s, -1)) : cambiarMes(-1))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[11rem] text-center text-sm font-semibold text-texto-fuerte">
          {tab === 'nomina' ? etiquetaSemana(semana) : `${MESES[mes]} ${anio}`}
        </span>
        <button
          onClick={() => (tab === 'nomina' ? setSemana((s) => sumarSemanas(s, 1)) : cambiarMes(1))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {estado === 'prohibido' ? (
        <Aviso
          texto={
            tab === 'margen'
              ? 'El margen es información sensible: solo la Directora puede verlo.'
              : 'Esta sección es solo para coordinación (Directora y Subdirectora).'
          }
        />
      ) : estado === 'error' ? (
        <Aviso texto="No se pudo cargar la información. ¿Está arriba la API?" />
      ) : estado === 'cargando' ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel" />
      ) : tab === 'ingresos' && ingresos ? (
        <VistaIngresos data={ingresos} />
      ) : tab === 'nomina' && nomina ? (
        <VistaNomina data={nomina} onCambio={cargar} />
      ) : tab === 'margen' && margen ? (
        <VistaMargen data={margen} nannies={nannies} onGuardar={cargar} />
      ) : tab === 'niveles' && niveles ? (
        <VistaNiveles
          data={niveles}
          esDirectora={sesion?.rol === 'DIRECTORA'}
          anio={anio}
          mes={mes}
          mesLabel={`${MESES[mes]} ${anio}`}
          onGuardar={recargarNiveles}
        />
      ) : null}
    </div>
  );
}

function VistaIngresos({ data }: { data: Ingresos }) {
  const { paquetes, individuales, totales, horasPagadas } = data;
  return (
    <div className="space-y-4">
      <TarjetaHoras horas={horasPagadas} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tarjeta titulo="Paquetes" monto={totales.paquetes} icon={<Package className="h-4 w-4" />} />
        <Tarjeta titulo="Individuales" monto={totales.individuales} icon={<Receipt className="h-4 w-4" />} />
        <Tarjeta titulo="Total del mes" monto={totales.total} destacado />
      </div>

      <Seccion
        titulo="Paquetes contratados"
        nota="El ingreso del paquete se registra al contratarlo."
        count={paquetes.length}
      >
        {paquetes.length === 0 ? (
          <VacioFila texto="Sin paquetes contratados este mes." />
        ) : (
          paquetes.map((p) => (
            <Fila key={p.id} izq={p.familia} centro={`Paquete ${p.horas} h`} fecha={p.fecha} monto={p.monto} />
          ))
        )}
      </Seccion>

      <Seccion
        titulo="Servicios individuales"
        nota="Servicios sueltos confirmados (aceptados o completados), con su cobro del menú."
        count={individuales.length}
      >
        {individuales.length === 0 ? (
          <VacioFila texto="Sin servicios individuales este mes." />
        ) : (
          individuales.map((s) => (
            <Fila key={s.id} izq={s.familia} centro={TIPO_LABEL[s.tipoServicio]} fecha={s.fecha} monto={s.monto} />
          ))
        )}
      </Seccion>
    </div>
  );
}

/** Indicador de horas pagadas del mes (Paula): color por rango, sin rojo.
 *  <400 naranja (bajo) · 400-800 azul (en rango) · >800 verde limón (óptimo).
 *  El azul es distinto al marca-azul del total en dinero, a propósito. */
function TarjetaHoras({ horas }: { horas: number }) {
  const rango =
    horas < 400
      ? { bg: '#F97316', label: 'Por debajo del rango' }
      : horas <= 800
        ? { bg: '#3B82F6', label: 'En rango' }
        : { bg: '#9DCD5A', label: 'Rango óptimo' };
  return (
    <div className="rounded-2xl p-4 text-white shadow-card" style={{ backgroundColor: rango.bg }}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-white/85">
        <Clock className="h-4 w-4" />
        Horas pagadas del mes
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold leading-none">
          {horas.toLocaleString('es-MX')} <span className="text-xl font-semibold">h</span>
        </p>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{rango.label}</span>
      </div>
    </div>
  );
}

function VistaNomina({ data, onCambio }: { data: Nomina; onCambio: () => Promise<void> }) {
  const { nannies, total, rango } = data;
  return (
    <div className="space-y-3">
      <Tarjeta titulo="Total de la semana (pago del sábado)" monto={total} destacado />

      {nannies.length === 0 ? (
        <Aviso texto="No hay servicios completados en esta semana." />
      ) : (
        nannies.map((n) => (
          <NominaNannieCard key={n.nannieId} n={n} semana={rango.desde} onCambio={onCambio} />
        ))
      )}
    </div>
  );
}

/** Tarjeta de nómina por nannie, colapsable (Paula: ver solo el resumen y el
 *  total; al hacer clic se despliega el detalle por servicio + bonos). Incluye
 *  el check "pagado" por nannie/semana. */
function NominaNannieCard({
  n,
  semana,
  onCambio,
}: {
  n: import('@/lib/api').NominaNannie;
  semana: string;
  onCambio: () => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busy, setBusy] = useState(false);

  async function togglePagado() {
    setBusy(true);
    await api.marcarPago(n.nannieId, semana, !n.pagado).catch(() => undefined);
    await onCambio();
    setBusy(false);
  }

  return (
    <div className={cn('rounded-2xl bg-panel p-4 shadow-card', n.pagado && 'ring-1 ring-marca-verde/50')}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-texto-suave transition', abierto && 'rotate-180')}
          />
          <Avatar foto={n.foto} nombre={n.nombre} size={36} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-texto-fuerte">{n.nombre}</p>
            <p className="text-xs text-texto-suave">Nivel: {NIVEL_LABEL[n.nivel] ?? n.nivel}</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-base font-bold text-texto-fuerte">{money(n.total)}</span>
          <button
            type="button"
            onClick={togglePagado}
            disabled={busy}
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50',
              n.pagado
                ? 'bg-marca-verde/25 text-[#5c7a2e]'
                : 'border border-borde text-texto-suave hover:bg-fondo',
            )}
          >
            {n.pagado ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {n.pagado ? 'Pagado' : 'Marcar pagado'}
          </button>
        </div>
      </div>

      {(!n.documentacionCompleta || !n.capacitacionCompleta) && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {!n.documentacionCompleta && !n.capacitacionCompleta
              ? 'Documentación y capacitación incompletas'
              : !n.documentacionCompleta
                ? 'Documentación incompleta'
                : 'Capacitación incompleta'}
            {' — considera retener el pago hasta que la complete.'}
          </span>
        </div>
      )}

      {n.strikesPendientes > 0 && (
        <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-[#5B292D]/8 px-3 py-2 text-xs text-[#5B292D]">
          <span className="flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {n.strikesPendientes === 1
                ? 'Descuento por 3 strikes pendiente de aplicar (−20% de un servicio).'
                : `${n.strikesPendientes} descuentos por strikes pendientes de aplicar (−20% c/u).`}
            </span>
          </span>
          <Link
            href={`/nannies/${n.nannieId}`}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Aplicar
          </Link>
        </div>
      )}

      {abierto && (
        <>
          <div className="mt-2 divide-y divide-borde">
            {n.servicios.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-texto-fuerte">
                    {TIPO_LABEL[s.tipoServicio]} · {s.familia}
                  </p>
                  <p className="text-xs text-texto-suave">
                    {fechaCorta(s.fecha)} · {s.duracionHoras} h
                    {s.descuento ? (
                      <span className="text-[#5B292D]"> · −{money(s.descuento)} incidencia</span>
                    ) : null}
                  </p>
                </div>
                {s.monto == null ? (
                  <span
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700"
                    title={s.motivo}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Tarifa pendiente
                  </span>
                ) : (
                  <span className="shrink-0 font-semibold text-texto-fuerte">{money(s.monto)}</span>
                )}
              </div>
            ))}
            {n.bonos.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-texto-fuerte">Bono · {b.motivo}</p>
                  <p className="text-xs text-texto-suave">{fechaCorta(b.fecha)}</p>
                </div>
                <span className="shrink-0 font-semibold text-[#3b6d11]">+{money(b.monto)}</span>
              </div>
            ))}
          </div>
          {n.tienePendientes && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Hay servicios con tarifa aún no definida (no suman al total). Se calcularán cuando se
              confirme su tabulador.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function VistaMargen({
  data,
  nannies,
  onGuardar,
}: {
  data: Margen;
  nannies: NannieLite[];
  onGuardar: () => Promise<void>;
}) {
  const { servicios, totales, pendientes, bonos } = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tarjeta titulo="Cobro" monto={totales.cobro} />
        <Tarjeta titulo="Pago" monto={totales.pago} />
        <Tarjeta titulo="Comisión + bonos" monto={totales.comision + totales.bonos} />
        <Tarjeta titulo="Margen neto del mes" monto={totales.margenNeto} destacado />
      </div>

      {pendientes > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {pendientes} servicio(s) con tarifa de pago pendiente: su margen no está incluido en el
          total hasta que se confirme el tabulador.
        </p>
      )}

      {servicios.length === 0 ? (
        <Aviso texto="No hay servicios completados este mes." />
      ) : (
        <div className="space-y-2">
          {servicios.map((s) => (
            <MargenFila key={s.servicioId} s={s} onGuardar={onGuardar} />
          ))}
        </div>
      )}

      <BonosPanel bonos={bonos} totalBonos={totales.bonos} nannies={nannies} onGuardar={onGuardar} />
    </div>
  );
}

/** Bonos manuales del mes: reducen el margen. Alta + lista (SOLO Directora). */
function BonosPanel({
  bonos,
  totalBonos,
  nannies,
  onGuardar,
}: {
  bonos: import('@/lib/api').BonoLite[];
  totalBonos: number;
  nannies: NannieLite[];
  onGuardar: () => Promise<void>;
}) {
  const [nannieId, setNannieId] = useState('');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  async function aplicar() {
    const n = Number(monto);
    if (!nannieId || !n || n <= 0 || !motivo.trim()) return;
    setBusy(true);
    await api.crearBono(nannieId, n, motivo.trim()).catch(() => undefined);
    setMonto('');
    setMotivo('');
    setNannieId('');
    await onGuardar();
    setBusy(false);
  }

  async function eliminar(id: string) {
    await api.eliminarBono(id).catch(() => undefined);
    await onGuardar();
  }

  const chico =
    'rounded-lg border border-borde bg-white px-2 py-1.5 text-sm outline-none focus:border-marca-azul';

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texto-fuerte">Bonos del mes</h2>
        {totalBonos > 0 && <span className="text-sm font-bold text-marca-rojo">−{money(totalBonos)}</span>}
      </div>
      <p className="mb-2 text-xs text-texto-suave">
        Bono manual (monto + a quién + por qué). Reduce el margen; sin reglas automáticas.
      </p>

      {bonos.length > 0 && (
        <div className="mb-3 divide-y divide-borde">
          {bonos.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-texto-fuerte">
                  {b.nannie} · {money(b.monto)}
                </p>
                <p className="truncate text-xs text-texto-suave">
                  {b.motivo} · {fechaCorta(b.fecha)}
                </p>
              </div>
              <button
                onClick={() => eliminar(b.id)}
                className="shrink-0 text-xs text-texto-suave hover:text-marca-rojo"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
        <select value={nannieId} onChange={(e) => setNannieId(e.target.value)} className={chico}>
          <option value="">¿A quién?</option>
          {nannies.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto $"
          className={chico}
        />
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (por qué)"
          className={cn(chico, 'sm:col-span-3')}
        />
      </div>
      <button
        onClick={aplicar}
        disabled={busy || !nannieId || !monto || !motivo.trim()}
        className="mt-2 rounded-lg bg-marca-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Aplicando…' : 'Aplicar bono'}
      </button>
    </div>
  );
}

function MargenFila({ s, onGuardar }: { s: import('@/lib/api').MargenServicio; onGuardar: () => Promise<void> }) {
  const [comision, setComision] = useState(s.comision ? String(s.comision) : '');
  const [ajuste, setAjuste] = useState(s.ajuste ? String(s.ajuste) : '');

  async function guardar(campo: 'comision' | 'ajuste', valor: string, original: number) {
    const num = valor.trim() === '' ? null : Number(valor);
    if (num !== null && (Number.isNaN(num) || num < 0)) return;
    if ((num ?? 0) === original) return; // sin cambio real
    await api.editarFinanza(s.servicioId, { [campo]: num }).catch(() => undefined);
    await onGuardar();
  }

  return (
    <div className="rounded-xl border border-borde bg-panel p-3 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-texto-fuerte">
            {TIPO_LABEL[s.tipoServicio]} · {s.familia}
          </p>
          <p className="text-xs text-texto-suave">
            {s.nannie} · {fechaCorta(s.fecha)} · {s.zona}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-texto-suave">Margen</p>
          <p className={cn('text-sm font-bold', s.pendiente ? 'text-amber-700' : 'text-texto-fuerte')}>
            {s.pendiente ? 'Pendiente' : money(s.margen ?? 0)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato label="Cobro" valor={money(s.cobro)} />
        <Dato label="Pago" valor={s.pago == null ? '—' : money(s.pago)} />
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-texto-suave">Comisión</span>
          <input
            type="number"
            min={0}
            value={comision}
            onChange={(e) => setComision(e.target.value)}
            onBlur={() => guardar('comision', comision, s.comision)}
            placeholder="—"
            className="w-full rounded-lg border border-borde bg-white px-2 py-1 text-sm outline-none focus:border-marca-azul"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-texto-suave">Ajuste</span>
          <input
            type="number"
            min={0}
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
            onBlur={() => guardar('ajuste', ajuste, s.ajuste)}
            placeholder="—"
            className="w-full rounded-lg border border-borde bg-white px-2 py-1 text-sm outline-none focus:border-marca-azul"
          />
        </label>
      </div>
      {s.descuentoNannie > 0 && (
        <p className="mt-2 text-xs text-[#5B292D]">
          Descuento por incidencia al pago: −{money(s.descuentoNannie)}
          {s.pago != null && ` (pago neto ${money(s.pago - s.descuentoNannie)})`} — el margen ya lo refleja.
        </p>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-texto-suave">{label}</p>
      <p className="text-sm font-medium text-texto-fuerte">{valor}</p>
    </div>
  );
}

function VistaNiveles({
  data,
  esDirectora,
  anio,
  mes,
  mesLabel,
  onGuardar,
}: {
  data: Niveles;
  esDirectora: boolean;
  anio: number;
  mes: number; // 0-indexado
  mesLabel: string;
  onGuardar: () => Promise<void>;
}) {
  const [resultado, setResultado] = useState<import('@/lib/api').CierreResultado | null>(null);
  const [ejecutando, setEjecutando] = useState(false);

  async function ejecutar() {
    setEjecutando(true);
    try {
      const r = await api.cerrarMes(anio, mes + 1); // 0-indexado → 1-12
      setResultado(r);
      await onGuardar();
    } catch {
      // el aviso general ya cubre errores de carga
    } finally {
      setEjecutando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Nivel vigente por nannie */}
      <div className="rounded-2xl bg-panel p-4 shadow-card">
        <h2 className="text-sm font-semibold text-texto-fuerte">Nivel-tarifa vigente</h2>
        <p className="mb-2 text-xs text-texto-suave">
          Se fija en el cierre de mes según las horas del mes anterior (umbral 25 h).
        </p>
        <div className="divide-y divide-borde">
          {data.nannies.map((n) => (
            <div key={n.nannieId} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-texto-fuerte">{n.nombre}</p>
                <p className="text-xs text-texto-suave">
                  Rango {RANGO_LABEL[n.rango] ?? n.rango} · {n.serviciosAcumulados} servicios de por vida
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  nivelClase(n.nivelActual),
                )}
              >
                {NIVEL_LABEL[n.nivelActual] ?? n.nivelActual}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ejecutar cierre (solo Directora) */}
      {esDirectora ? (
        <div className="rounded-2xl border border-borde bg-fondo p-4">
          <p className="mb-2 text-xs text-texto-suave">
            Cerrar <strong className="text-texto-fuerte">{mesLabel}</strong>: evalúa las horas
            completadas de ese mes por nannie y fija su nivel-tarifa para el mes siguiente (queda
            registro auditable).
          </p>
          <button
            onClick={ejecutar}
            disabled={ejecutando}
            className="rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {ejecutando ? 'Ejecutando…' : `Ejecutar cierre de ${mesLabel}`}
          </button>
        </div>
      ) : (
        <Aviso texto="Solo la Directora puede ejecutar el cierre de mes." />
      )}

      {/* Resultado del cierre recién ejecutado */}
      {resultado && (
        <div className="rounded-2xl bg-marca-verde/10 p-4">
          <p className="mb-2 text-sm font-semibold text-[#3b6d11]">
            Cierre aplicado a {MESES[resultado.aplicaA.mes - 1]} {resultado.aplicaA.anio}
          </p>
          <div className="divide-y divide-borde/60">
            {resultado.resultados.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span className="text-texto-fuerte">
                  {r.nannie} · {r.horas} h
                </span>
                <span className="text-xs">
                  {r.cambio ? (
                    <span className="font-semibold text-texto-fuerte">
                      {NIVEL_LABEL[r.nivelAnterior]} → {NIVEL_LABEL[r.nivelAsignado]}
                    </span>
                  ) : (
                    <span className="text-texto-suave">
                      {NIVEL_LABEL[r.nivelAsignado]} (sin cambio)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial auditable */}
      {data.cierres.length > 0 && (
        <div className="rounded-2xl bg-panel p-4 shadow-card">
          <h2 className="text-sm font-semibold text-texto-fuerte">Historial de cierres</h2>
          <p className="mb-2 text-xs text-texto-suave">Registro auditable de cada cierre.</p>
          <div className="divide-y divide-borde">
            {data.cierres.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-texto-fuerte">{c.nannie}</p>
                  <p className="text-xs text-texto-suave">
                    {MESES[c.mes - 1]} {c.anio} · {c.horasMesPrevio} h el mes previo
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    nivelClase(c.nivelAsignado),
                  )}
                >
                  {NIVEL_LABEL[c.nivelAsignado] ?? c.nivelAsignado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  titulo,
  monto,
  icon,
  destacado,
}: {
  titulo: string;
  monto: number;
  icon?: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div className={cn('rounded-2xl p-4 shadow-card', destacado ? 'bg-marca-azul text-white' : 'bg-panel')}>
      <p
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          destacado ? 'text-white/80' : 'text-texto-suave',
        )}
      >
        {icon}
        {titulo}
      </p>
      <p className={cn('mt-1 text-xl font-bold', destacado ? 'text-white' : 'text-texto-fuerte')}>
        {money(monto)}
      </p>
    </div>
  );
}

/** Sección colapsable (Paula: no ver el "chorizote" siempre). Cerrada por
 *  defecto; el encabezado muestra el título, el conteo y un chevron. */
function Seccion({
  titulo,
  nota,
  count,
  children,
}: {
  titulo: string;
  nota: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-texto-fuerte">
            {titulo}
            {count != null && <span className="ml-1 font-normal text-texto-suave">({count})</span>}
          </h2>
          <p className="text-xs text-texto-suave">{nota}</p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-texto-suave transition', abierto && 'rotate-180')}
        />
      </button>
      {abierto && <div className="mt-2 divide-y divide-borde">{children}</div>}
    </div>
  );
}

function Fila({ izq, centro, fecha, monto }: { izq: string; centro: string; fecha: string; monto: number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-texto-fuerte">{izq}</p>
        <p className="text-xs text-texto-suave">
          {centro} · {fechaCorta(fecha)}
        </p>
      </div>
      <span className="shrink-0 font-semibold text-texto-fuerte">{money(monto)}</span>
    </div>
  );
}

function VacioFila({ texto }: { texto: string }) {
  return <p className="py-3 text-center text-xs text-texto-suave">{texto}</p>;
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}

function fechaCorta(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
