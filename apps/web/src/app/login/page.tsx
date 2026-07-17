'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Logo } from '@/components/logo';

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
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Mensaje genérico: no revela si el correo existe (SEGURIDAD §10).
        setError('Credenciales inválidas.');
      } else {
        setError('No se pudo conectar. El servidor puede estar despertando; espera unos segundos e intenta de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      {/* Fondo: degradado suave de marca (Claro + identidad Nannies) */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-marca-rosa/10 via-white to-marca-azul/10" />

      {/* Motion: blobs de marca flotando suavemente */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-marca-rosa/25 blur-3xl animate-float" />
        <span className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-marca-morado/20 blur-3xl animate-float-alt" />
        <span
          className="absolute -bottom-10 left-1/4 h-64 w-64 rounded-full bg-marca-azul/25 blur-3xl animate-float"
          style={{ animationDelay: '1.4s' }}
        />
        <span
          className="absolute -right-12 bottom-16 h-44 w-44 rounded-full bg-marca-verde/20 blur-3xl animate-float-alt"
          style={{ animationDelay: '0.7s' }}
        />
      </div>

      {/* Tarjeta de acceso */}
      <div className="w-full max-w-sm animate-fade-up rounded-2xl border border-white/60 bg-panel/90 p-8 shadow-marca backdrop-blur-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo className="mb-3 h-24 w-auto animate-pop-in" />
          <p className="text-sm text-texto-suave">Bienvenida — ingresa a tu operación</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-texto-fuerte">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-borde bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20"
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
              className="w-full rounded-xl border border-borde bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-marca-rojo">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-gradient-to-r from-marca-azul to-marca-morado py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>

      <div className="absolute bottom-5 text-center text-xs text-texto-suave">
        <p className="font-medium text-texto-fuerte">
          Nannies Workflow <span className="font-normal text-texto-suave">by Operalia</span>
        </p>
        <p className="mt-0.5 text-[11px]">© 2026 Operalia · Todos los derechos reservados</p>
      </div>
    </main>
  );
}
