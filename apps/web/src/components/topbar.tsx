'use client';

import { useRouter } from 'next/navigation';
import { Search, LogOut } from 'lucide-react';
import { api } from '@/lib/api';

/** Top bar: búsqueda (escritorio) + salir. En celular muestra la marca. */
export function Topbar() {
  const router = useRouter();

  async function salir() {
    await api.logout().catch(() => undefined);
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-borde bg-panel/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 md:hidden">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca-azul/10">🐣</span>
        <span className="text-sm font-semibold">Nannies</span>
      </div>

      <div className="relative hidden flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-suave" />
        <input
          placeholder="Buscar nannie, familia o zona…"
          className="w-full max-w-md rounded-xl border border-borde bg-fondo px-9 py-2 text-sm outline-none focus:border-marca-azul"
        />
      </div>

      <button
        onClick={salir}
        className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-texto-suave transition hover:bg-fondo hover:text-marca-rojo"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </header>
  );
}
