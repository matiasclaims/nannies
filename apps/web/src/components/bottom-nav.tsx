'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, TrendingUp, X } from 'lucide-react';
import { navPara } from '@/lib/nav';
import { api, type Sesion } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Bottom nav de celular (los ítems `movil` visibles para el rol). Piel "Claro".
 *  Los módulos restantes (Familias, Finanzas, Reportes, Avance) viven en el
 *  menú "Más" para no saturar la barra. */
export function BottomNav() {
  const pathname = usePathname();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [masAbierto, setMasAbierto] = useState(false);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  // Cierra el menú al navegar.
  useEffect(() => {
    setMasAbierto(false);
  }, [pathname]);

  const visibles = navPara(sesion?.rol);
  const items = visibles.filter((i) => i.movil);
  const resto = visibles.filter((i) => !i.movil);

  // Avance: provisional, solo coordinación (igual que el sidebar).
  const extras = [
    ...resto.map((i) => ({ href: i.href, label: i.label, icon: i.icon })),
    ...(sesion && sesion.rol !== 'NANNIE'
      ? [{ href: '/avance', label: 'Avance del proyecto', icon: TrendingUp }]
      : []),
  ];

  const activoEnMas = extras.some((e) => pathname.startsWith(e.href));

  return (
    <>
      {masAbierto && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm"
            onClick={() => setMasAbierto(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-borde bg-panel p-3 pb-6 shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-sm font-semibold text-texto-fuerte">Más</span>
              <button
                type="button"
                aria-label="Cerrar"
                className="grid h-8 w-8 place-items-center rounded-full text-texto-suave hover:bg-fondo"
                onClick={() => setMasAbierto(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {extras.map((item) => {
                const activo = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition',
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
            </div>
          </div>
        </div>
      )}

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

        {extras.length > 0 && (
          <button
            type="button"
            onClick={() => setMasAbierto((v) => !v)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[11px]',
              masAbierto || activoEnMas ? 'text-marca-azul' : 'text-texto-suave',
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            Más
          </button>
        )}
      </nav>
    </>
  );
}
