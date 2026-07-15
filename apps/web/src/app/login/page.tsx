'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await api.login(email, password);
      router.push('/');
      router.refresh();
    } catch {
      // Mensaje genérico: no revela si el correo existe (SEGURIDAD §10).
      setError('Credenciales inválidas.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-fondo px-4">
      <div className="w-full max-w-sm rounded-2xl bg-panel p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-marca-azul/10 text-2xl">
            🐣
          </div>
          <h1 className="text-lg font-semibold text-texto-fuerte">Nannies Child Care</h1>
          <p className="text-sm text-texto-suave">Ingresa a tu operación</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-texto-fuerte">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20"
              placeholder="tu@correo.mx"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-texto-fuerte">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-marca-rojo">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-marca-azul py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
