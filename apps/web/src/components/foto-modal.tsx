'use client';

import { useRef, useState } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { Avatar } from './avatar';
import { redimensionarCuadrada } from '@/lib/imagen';

/** Modal para subir/cambiar/quitar una foto de perfil. Redimensiona en el
 *  navegador y entrega el data URL (o null al quitar) a `onGuardar`. */
export function FotoModal({
  nombre,
  fotoActual,
  titulo = 'Foto de perfil',
  onGuardar,
  onClose,
}: {
  nombre: string;
  fotoActual: string | null;
  titulo?: string;
  onGuardar: (foto: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [foto, setFoto] = useState<string | null>(fotoActual);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const cambiado = foto !== fotoActual;

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reelegir el mismo archivo
    if (!file) return;
    setError('');
    try {
      const dataUrl = await redimensionarCuadrada(file);
      setFoto(dataUrl);
    } catch {
      setError('No se pudo procesar la imagen. Prueba con otra.');
    }
  }

  async function guardar() {
    setBusy(true);
    setError('');
    try {
      await onGuardar(foto);
      onClose();
    } catch {
      setError('No se pudo guardar la foto.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">{titulo}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-texto-suave hover:bg-fondo">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Avatar foto={foto} nombre={nombre} size={128} />

          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={elegir} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-marca-azul hover:bg-fondo"
            >
              <Upload className="h-3.5 w-3.5" /> {foto ? 'Cambiar' : 'Subir foto'}
            </button>
            {foto && (
              <button
                onClick={() => setFoto(null)}
                className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-marca-rojo hover:bg-fondo"
              >
                <Trash2 className="h-3.5 w-3.5" /> Quitar
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-texto-suave">
            La imagen se recorta en cuadrado y se ajusta automáticamente.
          </p>
        </div>

        {error && <p className="mt-3 text-center text-sm text-marca-rojo">{error}</p>}

        <button
          onClick={guardar}
          disabled={busy || !cambiado}
          className="mt-4 w-full rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
