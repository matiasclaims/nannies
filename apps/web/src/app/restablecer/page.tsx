'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Logo } from '@/components/logo';

const input =
  'w-full rounded-xl border border-borde bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

function RestablecerForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [nueva, setNueva] = useState('');
  const [confirma, setConfirma] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const invalida = nueva.length < 8 || nueva !== confirma;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      return setError('Enlace inválido. Solicítalo de nuevo desde "¿Olvidaste tu contraseña?".');
    }
    if (invalida) {
      return setError(nueva !== confirma ? 'Las contraseñas no coinciden.' : 'La nueva debe tener al menos 8 caracteres.');
    }
    setBusy(true);
    setError('');
    try {
      await api.restablecerPassword(token, nueva);
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-panel/90 p-8 shadow-marca backdrop-blur-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo className="mb-3 h-16 w-auto" />
        <h1 className="text-base font-semibold text-texto-fuerte">Restablecer contraseña</h1>
      </div>

      {ok ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-[#3b6d11]">Tu contraseña se actualizó. Ya puedes iniciar sesión con ella.</p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-gradient-to-r from-marca-azul to-marca-morado px-5 py-2.5 text-sm font-semibold text-white"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-texto-fuerte">Nueva contraseña (mín. 8)</label>
            <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={input} autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-texto-fuerte">Confirmar nueva</label>
            <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={input} autoComplete="new-password" />
          </div>

          {error && <p className="text-sm text-marca-rojo">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-marca-azul to-marca-morado py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? 'Guardando…' : 'Guardar contraseña'}
          </button>

          <Link href="/login" className="block text-center text-xs text-marca-azul hover:underline">
            Volver a iniciar sesión
          </Link>
        </form>
      )}
    </div>
  );
}

export default function RestablecerPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-marca-rosa/10 via-white to-marca-azul/10" />
      <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-2 border-marca-azul border-t-transparent" />}>
        <RestablecerForm />
      </Suspense>
    </main>
  );
}
