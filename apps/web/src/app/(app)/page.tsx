'use client';

import { useEffect, useState } from 'react';
import { api, type Sesion } from '@/lib/api';
import { KpiCard } from '@/components/kpi-card';

export default function PanoramaPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Banner de bienvenida (piel "Claro": degradado azul) */}
      <section className="rounded-2xl bg-gradient-to-r from-marca-azul to-[#3ad0e8] p-6 text-white shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold md:text-2xl">Hola, {sesion?.nombre ?? '…'}</h1>
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

      {/* KPIs con barra de progreso (datos reales llegan con M7) */}
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

function BannerStat({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[11px] text-white/80">{titulo}</p>
      <p className="text-lg font-bold">{valor}</p>
      <p className="text-[11px] text-white/70">{nota}</p>
    </div>
  );
}
