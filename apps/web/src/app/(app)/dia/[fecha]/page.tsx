'use client';

import { useParams } from 'next/navigation';
import { PanoramaDia, hoyISO } from '@/components/panorama-dia';

/** Drilldown de un día del calendario: panorama de esa fecha. */
export default function DiaPage() {
  const params = useParams<{ fecha: string }>();
  const raw = Array.isArray(params.fecha) ? params.fecha[0] : params.fecha;
  // Solo aceptamos YYYY-MM-DD; cualquier otra cosa cae en hoy (evita listar todo).
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw ?? '') ? raw : hoyISO();
  return <PanoramaDia iso={iso} />;
}
