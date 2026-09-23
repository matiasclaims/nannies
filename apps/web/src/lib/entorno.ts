'use client';

import { useEffect, useState } from 'react';

/**
 * ¿Estamos en un entorno de REVISIÓN (preview/local) y no en producción?
 * Producción = dominio nannies.mx. Preview (Vercel) y local devuelven true.
 *
 * Se resuelve tras montar (window.location) para no romper la hidratación:
 * el primer render devuelve false en cualquier entorno y luego se ajusta.
 * Uso: ocultar herramientas provisionales (p. ej. "Avance del proyecto") en prod.
 */
export function useEsRevision(): boolean {
  const [esRevision, setEsRevision] = useState(false);
  useEffect(() => {
    try {
      setEsRevision(!window.location.hostname.endsWith('nannies.mx'));
    } catch {
      setEsRevision(false);
    }
  }, []);
  return esRevision;
}
