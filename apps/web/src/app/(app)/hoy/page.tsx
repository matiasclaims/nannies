'use client';

import { PanoramaDia, hoyISO } from '@/components/panorama-dia';

/** Panorama del día en curso (atajo "Calendario de hoy" del Panorama). */
export default function HoyPage() {
  return <PanoramaDia iso={hoyISO()} />;
}
