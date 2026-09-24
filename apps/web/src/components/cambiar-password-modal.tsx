'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

const input =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

/**
 * Cambio de contraseña propio (cualquier usuario, sobre su cuenta). Reusa el
 * endpoint /mi-password: verifica la actual y exige la nueva (>=8). Se abre
 * desde el área de perfil (sidebar y menú "Más").
 */
export function CambiarPasswordModal({ onClose }: { onClose: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirma, setConfirma] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const invalida = nueva.length < 8 || nueva !== confirma || actual.length === 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (invalida) {
      setError(
        nueva !== confirma
          ? 'Las contraseñas nuevas no coinciden.'
          : 'La nueva debe tener al menos 8 caracteres.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.cambiarMiPassword(actual, nueva);
      setListo(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-borde p-4">
          <h2 className="text-sm font-semibold text-texto-fuerte">Cambiar contraseña</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-texto-suave hover:bg-fondo">
            <X className="h-4 w-4" />
          </button>
        </div>

        {listo ? (
          <div className="space-y-3 p-6 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-marca-verde/15 text-marca-verde">
              <Check className="h-5 w-5" />
            </div>
            <p className="text-sm text-texto-fuerte">Tu contraseña se actualizó.</p>
            <button onClick={onClose} className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Contraseña actual</span>
              <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} className={input} autoComplete="current-password" autoFocus />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Nueva contraseña (mín. 8)</span>
              <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={input} autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Confirmar nueva</span>
              <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={input} autoComplete="new-password" />
            </label>
            {error && <p className="text-sm text-marca-rojo">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-lg border border-borde px-3 py-1.5 text-sm text-texto-suave hover:bg-fondo">
                Cancelar
              </button>
              <button type="submit" disabled={busy || invalida} className="rounded-lg bg-marca-azul px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
