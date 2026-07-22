'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api, type FamiliaLite, type Plaza } from '@/lib/api';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

const TRAMOS = [10, 20, 30, 40, 50];

export default function FamiliasPage() {
  const [familias, setFamilias] = useState<FamiliaLite[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [alta, setAlta] = useState(false);

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
        <button
          onClick={() => setAlta((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-marca-azul px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <UserPlus className="h-4 w-4" />
          {alta ? 'Cerrar' : 'Nueva familia'}
        </button>
      </div>

      {alta && <AltaFamilia onCreada={() => { setAlta(false); void cargar(); }} />}

      {estado === 'cargando' ? (
        <div className="h-32 animate-pulse rounded-2xl bg-panel" />
      ) : familias.length === 0 ? (
        <Aviso texto="Aún no hay familias. Crea la primera con “Nueva familia”." />
      ) : (
        <ul className="space-y-2">
          {familias.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-panel p-4 shadow-card"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-texto-fuerte">{f.nombreContacto}</p>
                <p className="text-xs text-texto-suave">
                  {f.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'}
                  {f.zona ? ` · ${f.zona}` : ''}
                </p>
              </div>
              <PaqueteCelda familia={f} onCambio={cargar} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Muestra el saldo del paquete activo, o el control para registrar uno. */
function PaqueteCelda({ familia, onCambio }: { familia: FamiliaLite; onCambio: () => Promise<void> }) {
  const [horas, setHoras] = useState(30);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const p = familia.paqueteActivo;
  if (p) {
    const pct = Math.round((p.horasConsumidas / p.horasTotales) * 100);
    return (
      <div className="w-52 shrink-0">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-texto-fuerte">Paquete activo</span>
          <span className="text-texto-suave">
            {p.horasRestantes} / {p.horasTotales} h
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-fondo">
          <div className="h-full rounded-full bg-marca-verde" style={{ width: `${100 - pct}%` }} />
        </div>
      </div>
    );
  }

  async function registrar() {
    setError('');
    setGuardando(true);
    try {
      await api.crearPaquete(familia.id, horas);
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="w-64 shrink-0">
      <div className="flex gap-2">
        <select
          value={horas}
          onChange={(e) => setHoras(Number(e.target.value))}
          className={cn(inputCls, 'flex-1')}
        >
          {TRAMOS.map((h) => (
            <option key={h} value={h}>
              {h} horas
            </option>
          ))}
        </select>
        <button
          onClick={registrar}
          disabled={guardando}
          className="shrink-0 rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? '…' : 'Registrar'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-marca-rojo">{error}</p>}
    </div>
  );
}

function AltaFamilia({ onCreada }: { onCreada: () => void }) {
  const [nombre, setNombre] = useState('');
  const [plaza, setPlaza] = useState<Plaza>('TOLUCA');
  const [zona, setZona] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await api.crearFamilia({ nombreContacto: nombre, plaza, zona: zona || undefined });
      onCreada();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <p className="mb-2 text-sm font-semibold text-texto-fuerte">Nueva familia</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de contacto"
          className={inputCls}
        />
        <select value={plaza} onChange={(e) => setPlaza(e.target.value as Plaza)} className={inputCls}>
          <option value="TOLUCA">Toluca</option>
          <option value="QUERETARO">Querétaro</option>
        </select>
        <input
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="Zona"
          className={inputCls}
        />
      </div>
      <button
        onClick={guardar}
        disabled={guardando || !nombre.trim()}
        className="mt-2 rounded-lg bg-marca-azul px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
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
