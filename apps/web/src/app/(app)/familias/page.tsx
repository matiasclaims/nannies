'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Upload, Search } from 'lucide-react';
import { api, type FamiliaLite, type Plaza } from '@/lib/api';

/** Normaliza para buscar: sin acentos, minúsculas. */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const inputCls =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

export default function FamiliasPage() {
  const [familias, setFamilias] = useState<FamiliaLite[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [alta, setAlta] = useState(false);
  const [q, setQ] = useState('');
  const [ocultarInactivas, setOcultarInactivas] = useState(false);
  // Filtro "solo con paquete activo" (viene del dashboard: /familias?paquete=activos).
  const [soloPaquete, setSoloPaquete] = useState(false);
  useEffect(() => {
    setSoloPaquete(new URLSearchParams(window.location.search).get('paquete') === 'activos');
  }, []);

  const cargar = useCallback(async () => {
    try {
      setFamilias(await api.listarFamilias());
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (estado === 'error') {
    return <Aviso texto="No se pudieron cargar las familias. ¿Está arriba la API?" />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-texto-fuerte">Familias</h1>
          <p className="text-sm text-texto-suave">
            Cardex de familias y su paquete de horas activo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/familias/importar"
            className="flex items-center gap-2 rounded-xl border border-borde px-3 py-2 text-sm font-medium text-texto-suave transition hover:bg-fondo"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Link>
          <button
            onClick={() => setAlta((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-marca-azul px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <UserPlus className="h-4 w-4" />
            {alta ? 'Cerrar' : 'Nueva familia'}
          </button>
        </div>
      </div>

      {alta && <AltaFamilia onCreada={() => { setAlta(false); void cargar(); }} />}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-suave" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre del papá/mamá, apellido o nombre del niño…"
          className={`${inputCls} pl-9`}
        />
      </div>

      {soloPaquete && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-marca-verde/10 px-3 py-2 text-xs text-[#3b6d11]">
          <span>Mostrando solo familias con <strong>paquete activo</strong>.</span>
          <button onClick={() => setSoloPaquete(false)} className="font-semibold text-marca-azul hover:underline">
            Ver todas
          </button>
        </div>
      )}

      {(() => {
        const nInactivas = familias.filter((f) => f.inactiva).length;
        if (nInactivas === 0) return null;
        return (
          <label className="flex items-center gap-2 text-xs text-texto-suave">
            <input type="checkbox" checked={ocultarInactivas} onChange={(e) => setOcultarInactivas(e.target.checked)} className="h-3.5 w-3.5" />
            Ocultar inactivas ({nInactivas} sin servicio en {60}+ días)
          </label>
        );
      })()}

      {estado === 'cargando' ? (
        <div className="h-32 animate-pulse rounded-2xl bg-panel" />
      ) : familias.length === 0 ? (
        <Aviso texto="Aún no hay familias. Crea la primera con “Nueva familia”." />
      ) : (
        <ul className="space-y-2">
          {familias
            .filter((f) => (!ocultarInactivas || !f.inactiva) && (!soloPaquete || f.paqueteActivo))
            .filter((f) => {
              const t = norm(q.trim());
              if (!t) return true;
              const heno = norm(
                [f.nombreContacto, f.apellido ?? '', ...(f.ninosNombres ?? [])].join(' '),
              );
              return heno.includes(t);
            })
            .map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-panel p-4 shadow-card"
            >
              <div className="min-w-0">
                <Link
                  href={`/familias/${f.id}`}
                  className="text-sm font-semibold text-texto-fuerte hover:text-marca-azul hover:underline"
                >
                  {f.nombreContacto} {f.apellido ?? ''}
                </Link>
                {f.estado === 'SUSPENDIDA' ? (
                  <span className="ml-2 rounded-full bg-marca-rojo/10 px-1.5 py-0.5 text-[10px] font-semibold text-marca-rojo">
                    Suspendida
                  </span>
                ) : f.inactiva ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    Inactiva
                  </span>
                ) : null}
                <p className="text-xs text-texto-suave">
                  {f.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'}
                  {f.zona ? ` · ${f.zona}` : ''} · {f.nServicios ?? 0} servicios
                  {f.ultimaAtencion ? ` · última ${fechaCortaFam(f.ultimaAtencion)}` : ''}
                </p>
              </div>
              {f.paqueteActivo && (
                <span className="shrink-0 rounded-full bg-marca-verde/15 px-2.5 py-1 text-xs font-semibold text-[#3b6d11]">
                  Paquete · {f.paqueteActivo.horasRestantes}/{f.paqueteActivo.horasTotales} h
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AltaFamilia({ onCreada }: { onCreada: () => void }) {
  const [f, setF] = useState({
    nombre: '',
    apellido: '',
    plaza: 'TOLUCA' as Plaza,
    zona: '',
    telefono: '',
    email: '',
    numeroEmergencia: '',
    direccion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }) as typeof p);

  async function guardar() {
    if (!f.nombre.trim()) return;
    setGuardando(true);
    try {
      const t = (s: string) => s.trim() || undefined;
      await api.crearFamilia({
        nombreContacto: f.nombre.trim(),
        apellido: t(f.apellido),
        plaza: f.plaza,
        zona: t(f.zona),
        telefono: t(f.telefono),
        email: t(f.email),
        numeroEmergencia: t(f.numeroEmergencia),
        direccion: t(f.direccion),
      });
      onCreada();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <p className="mb-1 text-sm font-semibold text-texto-fuerte">Nueva familia</p>
      <p className="mb-3 text-xs text-texto-suave">Datos esenciales; el resto del cardex se completa en el expediente.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre de contacto *" className={inputCls} />
        <input value={f.apellido} onChange={(e) => set('apellido', e.target.value)} placeholder="Apellido de la familia" className={inputCls} />
        <select value={f.plaza} onChange={(e) => set('plaza', e.target.value)} className={inputCls}>
          <option value="TOLUCA">Toluca</option>
          <option value="QUERETARO">Querétaro</option>
        </select>
        <input value={f.zona} onChange={(e) => set('zona', e.target.value)} placeholder="Zona / colonia" className={inputCls} />
        <input value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Teléfono" className={inputCls} />
        <input value={f.numeroEmergencia} onChange={(e) => set('numeroEmergencia', e.target.value)} placeholder="Número de emergencia" className={inputCls} />
        <input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Correo" className={inputCls} />
        <input value={f.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Dirección + referencias" className={inputCls} />
      </div>
      <button
        onClick={guardar}
        disabled={guardando || !f.nombre.trim()}
        className="mt-3 rounded-lg bg-marca-azul px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {guardando ? 'Guardando…' : 'Guardar familia'}
      </button>
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}

function fechaCortaFam(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
