'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Logo } from '@/components/logo';

/**
 * Gate M4: si el usuario (una nannie recién dada de alta) debe cambiar su
 * contraseña temporal, se le muestra la pantalla de cambio y NO puede usar el
 * resto del sistema hasta hacerlo.
 */
export function CambioPasswordGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'cambiar'>('cargando');

  const revisar = () =>
    api
      .me()
      .then((s) => setEstado(s.debeCambiarPassword ? 'cambiar' : 'ok'))
      .catch(() => setEstado('ok')); // si /me falla, deja pasar (login lo maneja)

  useEffect(() => {
    void revisar();
  }, []);

  if (estado === 'cargando') {
    return (
      <div className="grid min-h-screen place-items-center bg-fondo">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-marca-azul border-t-transparent" />
      </div>
    );
  }
  if (estado === 'cambiar') return <PantallaCambio onListo={revisar} />;
  return <>{children}</>;
}

function PantallaCambio({ onListo }: { onListo: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirma, setConfirma] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const invalida = nueva.length < 8 || nueva !== confirma || actual.length === 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (invalida) {
      setError(nueva !== confirma ? 'Las contraseñas nuevas no coinciden.' : 'La nueva debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.cambiarMiPassword(actual, nueva);
      onListo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.');
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

  return (
    <div className="grid min-h-screen place-items-center bg-fondo p-4">
      <form onSubmit={guardar} className="w-full max-w-sm space-y-3 rounded-2xl bg-panel p-6 shadow-card">
        <div className="mb-1 flex justify-center">
          <Logo className="h-10 w-auto" />
        </div>
        <h1 className="text-center text-lg font-semibold text-texto-fuerte">Crea tu contraseña</h1>
        <p className="text-center text-xs text-texto-suave">
          Por seguridad, cambia la contraseña temporal antes de continuar.
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Contraseña temporal</span>
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} className={input} autoComplete="current-password" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Nueva contraseña (mín. 8)</span>
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={input} autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Confirmar nueva</span>
          <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={input} autoComplete="new-password" />
        </label>

        {error && <p className="text-sm text-marca-rojo">{error}</p>}

        <button
          type="submit"
          disabled={busy || invalida}
          className="w-full rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </form>
    </div>
  );
}
