'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navPara } from '@/lib/nav';
import { api, type Sesion } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Bottom nav de celular (los ítems `movil` visibles para el rol). Piel "Claro". */
export function BottomNav() {
  const pathname = usePathname();
  const [sesion, setSesion] = useState<Sesion | null>(null);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  const items = navPara(sesion?.rol).filter((i) => i.movil);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-borde bg-panel/95 backdrop-blur md:hidden">
      {items.map((item) => {
        const activo = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[11px]',
              activo ? 'text-marca-azul' : 'text-texto-suave',
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
