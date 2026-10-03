'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bug, Check, Clock, Mail, Monitor, ExternalLink, Loader2 } from 'lucide-react';
import { api, ApiError, type ProblemaReporte } from '@/lib/api';
import { useModoPerfil } from '@/lib/modo-perfil';
import { cn } from '@/lib/utils';

const FILTROS = [
  { clave: 'TODOS', label: 'Todos' },
  { clave: 'NUEVO', label: 'Nuevos' },
  { clave: 'EN_REVISION', label: 'En revisión' },
  { clave: 'RESUELTO', label: 'Resueltos' },
] as const;

const TIPO_LABEL: Record<string, string> = { ERROR: 'Error', SUGERENCIA: 'Sugerencia', DUDA: 'Duda' };
const ESTADO_UI: Record<string, { label: string; cls: string }> = {
  NUEVO: { label: 'Nuevo', cls: 'bg-marca-azul/15 text-[#0b6b7d]' },
  EN_REVISION: { label: 'En revisión', cls: 'bg-amber-100 text-amber-800' },
  RESUELTO: { label: 'Resuelto', cls: 'bg-marca-verde/20 text-[#3b6d11]' },
};

export default function ProblemasPage() {
  const { sesion } = useModoPerfil();
  const [filtro, setFiltro] = useState<string>('TODOS');
  const [items, setItems] = useState<ProblemaReporte[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'prohibido' | 'error'>('cargando');

  const cargar = useCallback(() => {
    api
      .problemas(filtro)
      .then((d) => {
        setItems(d);
        setEstado('ok');
      })
      .catch((e) => setEstado(e instanceof ApiError && e.status === 403 ? 'prohibido' : 'error'));
  }, [filtro]);
  useEffect(cargar, [cargar]);

  if (sesion && sesion.rol !== 'PROGRAMADOR') {
    return <Aviso texto="Esta sección es solo para el perfil de programador." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Bug className="h-5 w-5 text-marca-azul" />
        <h1 className="text-lg font-semibold text-texto-fuerte">Problemas reportados</h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            onClick={() => setFiltro(f.clave)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              filtro === f.clave ? 'bg-marca-azul text-white' : 'bg-panel text-texto-suave border border-borde',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {estado === 'cargando' ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel" />
      ) : estado === 'prohibido' ? (
        <Aviso texto="Esta sección es solo para el perfil de programador." />
      ) : estado === 'error' ? (
        <Aviso texto="No se pudo cargar. Intenta de nuevo." />
      ) : (items?.length ?? 0) === 0 ? (
        <Aviso texto="No hay reportes con este filtro." />
      ) : (
        <div className="space-y-3">
          {items!.map((r) => (
            <ReporteCard key={r.id} r={r} onCambio={cargar} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReporteCard({ r, onCambio }: { r: ProblemaReporte; onCambio: () => void }) {
  const [resolviendo, setResolviendo] = useState(false);
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const estadoUi = ESTADO_UI[r.estado] ?? { label: r.estado, cls: 'bg-fondo text-texto-suave' };

  async function accion(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo completar la acción.');
      setBusy(false);
    }
  }

  const fecha = new Date(r.creadoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-fondo px-2 py-0.5 text-[11px] font-semibold text-texto-suave">
            {TIPO_LABEL[r.tipo] ?? r.tipo}
          </span>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', estadoUi.cls)}>{estadoUi.label}</span>
        </div>
        <span className="text-[11px] text-texto-suave">{fecha}</span>
      </div>

      <p className="whitespace-pre-wrap text-sm text-texto-fuerte">{r.descripcion}</p>

      <div className="mt-2 space-y-0.5 text-[11px] text-texto-suave">
        <p>
          {r.autorNombre} · {r.rol}
          {r.correo && (
            <span className="ml-1 inline-flex items-center gap-1">
              · <Mail className="h-3 w-3" /> {r.correo}
            </span>
          )}
        </p>
        {r.url && (
          <p className="inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> {r.url}
          </p>
        )}
        {r.userAgent && (
          <p className="inline-flex items-start gap-1 break-all">
            <Monitor className="mt-0.5 h-3 w-3 shrink-0" /> {r.userAgent}
          </p>
        )}
      </div>

      {r.estado === 'RESUELTO' && (
        <div className="mt-2 rounded-lg bg-marca-verde/10 px-3 py-2 text-[12px] text-[#3b6d11]">
          <strong>Resuelto</strong>
          {r.resueltoEn && ` · ${new Date(r.resueltoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`}
          {r.notaResolucion && <p className="mt-1 whitespace-pre-wrap text-texto-fuerte">{r.notaResolucion}</p>}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-marca-rojo">{error}</p>}

      {r.estado !== 'RESUELTO' && (
        <div className="mt-3">
          {resolviendo ? (
            <div className="space-y-2">
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Nota para quien reportó (se le manda por correo). Ej: Ya quedó corregido, actualiza la app."
                className="w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setResolviendo(false)}
                  disabled={busy}
                  className="rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-texto-suave hover:bg-fondo disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => accion(() => api.resolverProblema(r.id, nota.trim() || undefined))}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-lg bg-marca-verde px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Resolver y avisar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {r.estado === 'NUEVO' && (
                <button
                  onClick={() => accion(() => api.problemaEnRevision(r.id))}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-fondo disabled:opacity-50"
                >
                  <Clock className="h-3.5 w-3.5" /> En revisión
                </button>
              )}
              <button
                onClick={() => setResolviendo(true)}
                disabled={busy}
                className="flex items-center gap-1 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-medium text-marca-verde hover:bg-fondo disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Marcar resuelto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}
