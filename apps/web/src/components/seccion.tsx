'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TINTS: Record<string, string> = {
  azul: 'bg-marca-azul/12 text-marca-azul',
  verde: 'bg-marca-verde/25 text-[#5c7a2e]',
  vino: 'bg-[#5B292D]/12 text-[#5B292D]',
  morado: 'bg-marca-morado/12 text-marca-morado',
};

/** Tarjeta desplegable con ícono (look & feel Nannies). Se usa en el expediente
 *  para agrupar Desempeño, Expediente, Incidencias y Bitácora. */
export function Seccion({
  icon: Icon,
  title,
  tint = 'azul',
  subtitle,
  headerRight,
  defaultOpen = true,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tint?: keyof typeof TINTS | string;
  subtitle?: string;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-panel shadow-card">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', TINTS[tint] ?? TINTS.azul)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-texto-fuerte">{title}</span>
            {subtitle && <span className="block truncate text-xs text-texto-suave">{subtitle}</span>}
          </span>
        </button>
        {headerRight}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Contraer' : 'Expandir'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-texto-suave hover:bg-fondo"
        >
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
