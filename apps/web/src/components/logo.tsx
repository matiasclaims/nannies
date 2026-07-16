'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Logo de Nannies. Usa /nannies-logo.png (colócalo en apps/web/public/).
 * Si el archivo aún no existe, muestra un respaldo tipográfico decente.
 */
export function Logo({ className, alt = 'Nannies Child Care' }: { className?: string; alt?: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <span className={cn('inline-flex flex-col leading-none', className)}>
        <span className="font-serif text-2xl italic text-texto-fuerte">Nannies</span>
        <span className="text-[9px] font-medium tracking-[0.25em] text-texto-suave">CHILD CARE</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/nannies-logo.png" alt={alt} onError={() => setError(true)} className={className} />
  );
}
