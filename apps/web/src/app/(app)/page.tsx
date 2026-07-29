'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { api, type Sesion, type Servicio } from '@/lib/api';
import { KpiCard } from '@/components/kpi-card';

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
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-2xl bg-gradient-to-r from-marca-azul to-[#3ad0e8] p-6 text-white shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold md:text-2xl">Hola, {nombre ?? '…'}</h1>
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs capitalize">{hoy}</span>
        </div>
        <p className="mt-1 text-sm text-white/90">Este es el panorama de tu operación hoy</p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <BannerStat titulo="Servicios hoy" valor="—" nota="pendiente de datos" />
          <BannerStat titulo="Por asignar" valor="—" nota="requieren tu decisión" />
          <BannerStat titulo="Aceptación" valor="—" nota="estable" />
          <BannerStat titulo="Sin cobertura" valor="—" nota="en riesgo" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Ingreso no capturado" valor="—" progreso={0} color="rosa" />
        <KpiCard titulo="Aceptación" valor="—" progreso={0} color="verde" />
        <KpiCard titulo="Servicios del mes" valor="—" progreso={0} color="azul" />
        <KpiCard titulo="Cobertura de zonas" valor="—" progreso={0} color="morado" />
      </section>

      <p className="text-center text-xs text-texto-suave">
        El Panorama (M7) se conecta a datos reales al final de la construcción. Esta es la piel
        &ldquo;Claro&rdquo; validada, lista para recibirlos.
      </p>
    </div>
  );
}

/** Panorama personal de la nannie: su actividad, sin datos de negocio. */
function PanoramaNannie({ nombre }: { nombre: string }) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
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

      <Link
        href="/calendario"
        className="flex items-center justify-center gap-2 rounded-2xl bg-panel p-4 text-sm font-semibold text-marca-azul shadow-card transition hover:brightness-95"
      >
        <CalendarDays className="h-5 w-5" />
        Ir a mi calendario (disponibilidad y ofertas)
      </Link>

      <p className="text-center text-xs text-texto-suave">
        Aquí verás tu historial y tus ganancias cuando se conecte el panel final (M7).
      </p>
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
