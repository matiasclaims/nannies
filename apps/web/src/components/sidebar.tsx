'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { NAV } from '@/lib/nav';
import { api, type Sesion } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

const ROL_LABEL: Record<Sesion['rol'], string> = {
  DIRECTORA: 'Directora',
  SUBDIRECTORA: 'Subdirectora',
  NANNIE: 'Nannie',
};

/** Sidebar de escritorio (piel "Claro"): marca arriba, perfil abajo. */
export function Sidebar() {
  const pathname = usePathname();
  const [sesion, setSesion] = useState<Sesion | null>(null);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-borde bg-panel px-3 py-5 md:flex">
      <div className="mb-6 px-2">
        <Logo className="h-12 w-auto" />
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const activo = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                activo
                  ? 'bg-marca-azul/10 font-semibold text-marca-azul'
                  : 'text-texto-suave hover:bg-fondo hover:text-texto-fuerte',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* PROVISIONAL: seguimiento de avance para Paula (se retira al entregar) */}
      <Link
        href="/avance"
        className={cn(
          'mt-2 flex items-center gap-3 rounded-xl border border-dashed border-marca-morado/40 px-3 py-2 text-sm transition',
          pathname.startsWith('/avance')
            ? 'bg-marca-morado/10 font-semibold text-marca-morado'
            : 'text-texto-suave hover:bg-fondo hover:text-marca-morado',
        )}
      >
        <TrendingUp className="h-[18px] w-[18px]" />
        Avance del proyecto
      </Link>

      {/* Perfil actual (abajo-izquierda) */}
      <div className="mt-auto border-t border-borde pt-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-marca-azul/10 text-xs font-semibold text-marca-azul">
            {sesion ? sesion.nombre.slice(0, 2).toUpperCase() : '··'}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-texto-fuerte">
              {sesion?.nombre ?? 'Cargando…'}
            </p>
            <p className="text-xs text-texto-suave">{sesion ? ROL_LABEL[sesion.rol] : ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
