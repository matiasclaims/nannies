'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { X, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';

/** M6 · 6.2 — Muestra el link + QR de la encuesta de papás de un servicio.
 *  La nannie (su servicio) o coordinación lo comparten con la familia. */
export function EncuestaLinkModal({ servicioId, onCerrar }: { servicioId: string; onCerrar: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    api
      .linkEncuesta(servicioId)
      .then(async ({ token }) => {
        const u = `${window.location.origin}/encuesta/${token}`;
        setUrl(u);
        setQr(await QRCode.toDataURL(u, { width: 220, margin: 1 }));
      })
      .catch(() => setError('No se pudo generar la encuesta.'));
  }, [servicioId]);

  async function copiar() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onCerrar}>
      <div className="w-full max-w-sm rounded-2xl bg-panel p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">Encuesta para la familia</h2>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? (
          <p className="py-6 text-center text-sm text-marca-rojo">{error}</p>
        ) : !qr ? (
          <p className="py-8 text-center text-sm text-texto-suave">Generando…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-texto-suave">
              Muéstrale este QR al papá o mándale el link para que califique el servicio.
            </p>
            <div className="flex justify-center rounded-xl bg-white p-3">
              <Image src={qr} alt="QR de la encuesta" width={200} height={200} unoptimized />
            </div>
            <div className="flex items-center gap-2">
              <input readOnly value={url ?? ''} className="min-w-0 flex-1 truncate rounded-lg border border-borde bg-fondo px-2 py-1.5 text-xs text-texto-suave" />
              <button
                onClick={copiar}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-marca-azul px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-95"
              >
                {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
