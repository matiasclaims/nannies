'use client';

import { useState } from 'react';
import { Bug, X } from 'lucide-react';
import { api, ApiError, type TipoReporteProblema } from '@/lib/api';
import { cn } from '@/lib/utils';

const TIPOS: { valor: TipoReporteProblema; label: string }[] = [
  { valor: 'ERROR', label: 'Error' },
  { valor: 'SUGERENCIA', label: 'Sugerencia' },
  { valor: 'DUDA', label: 'Duda' },
];

/** Botón flotante (todas las pantallas) para reportar un problema del sistema. */
export function BotonReportarProblema() {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoReporteProblema>('ERROR');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  function cerrar() {
    setAbierto(false);
    // Se limpia después de la animación de cierre (siguiente tick).
    setTimeout(() => { setEnviado(false); setDescripcion(''); setTipo('ERROR'); setError(''); }, 200);
  }

  async function enviar() {
    if (descripcion.trim().length < 3) { setError('Cuéntanos qué pasó (mínimo unas palabras).'); return; }
    setEnviando(true);
    setError('');
    try {
      await api.reportarProblema({
        descripcion: descripcion.trim(),
        tipo,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      setEnviado(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        title="Reportar un problema"
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-marca-azul px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-95 md:bottom-6 md:right-6"
      >
        <Bug className="h-5 w-5" />
        <span className="hidden sm:inline">Reportar un problema</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={cerrar}>
          <div className="w-full max-w-md rounded-2xl bg-panel p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-texto-fuerte">
                <Bug className="h-4 w-4 text-marca-azul" /> Reportar un problema
              </h2>
              <button onClick={cerrar} className="text-texto-suave hover:text-texto-fuerte"><X className="h-4 w-4" /></button>
            </div>

            {enviado ? (
              <div className="py-6 text-center">
                <p className="text-sm font-medium text-texto-fuerte">¡Gracias! Recibimos tu reporte.</p>
                <p className="mt-1 text-xs text-texto-suave">Lo revisaremos lo antes posible.</p>
                <button onClick={cerrar} className="mt-4 rounded-lg bg-marca-azul px-4 py-2 text-sm font-semibold text-white">Cerrar</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="mb-1 block text-xs font-medium text-texto-suave">Tipo</span>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS.map((t) => (
                      <button
                        key={t.valor}
                        type="button"
                        onClick={() => setTipo(t.valor)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium',
                          tipo === t.valor ? 'border-marca-azul bg-marca-azul/10 text-marca-azul' : 'border-borde text-texto-suave',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-texto-suave">¿Qué pasó?</span>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe el problema: qué hacías, qué esperabas y qué pasó."
                    className="w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul"
                  />
                </label>
                <p className="text-[11px] text-texto-suave">Se enviará junto con la pantalla en la que estás, para ayudarnos a resolverlo.</p>
                {error && <p className="text-xs text-marca-rojo">{error}</p>}
                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="w-full rounded-lg bg-marca-azul px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
                >
                  {enviando ? 'Enviando…' : 'Enviar reporte'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
