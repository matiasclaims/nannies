'use client';

import { useCallback, useEffect, useState } from 'react';
import { ListTodo, Plus, Trash2, Pencil, Check, Loader2 } from 'lucide-react';
import { api, ApiError, type BacklogItem, type PrioridadBacklog, type EstadoBacklog } from '@/lib/api';
import { useModoPerfil } from '@/lib/modo-perfil';
import { cn } from '@/lib/utils';

const FILTROS = [
  { clave: 'TODOS', label: 'Todos' },
  { clave: 'PENDIENTE', label: 'Pendientes' },
  { clave: 'EN_PROGRESO', label: 'En progreso' },
  { clave: 'HECHO', label: 'Hechos' },
] as const;

const ESTADOS: { clave: EstadoBacklog; label: string }[] = [
  { clave: 'PENDIENTE', label: 'Pendiente' },
  { clave: 'EN_PROGRESO', label: 'En progreso' },
  { clave: 'HECHO', label: 'Hecho' },
];
const PRIORIDADES: { clave: PrioridadBacklog; label: string }[] = [
  { clave: 'ALTA', label: 'Alta' },
  { clave: 'MEDIA', label: 'Media' },
  { clave: 'BAJA', label: 'Baja' },
];

const ESTADO_CLS: Record<EstadoBacklog, string> = {
  PENDIENTE: 'bg-marca-azul/15 text-[#0b6b7d]',
  EN_PROGRESO: 'bg-amber-100 text-amber-800',
  HECHO: 'bg-marca-verde/20 text-[#3b6d11]',
};
const PRIORIDAD_CLS: Record<PrioridadBacklog, string> = {
  ALTA: 'bg-marca-rojo/15 text-marca-rojo',
  MEDIA: 'bg-amber-100 text-amber-800',
  BAJA: 'bg-slate-100 text-slate-500',
};

const inputCls = 'w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

export default function BacklogPage() {
  const { sesion } = useModoPerfil();
  const [filtro, setFiltro] = useState<string>('TODOS');
  const [items, setItems] = useState<BacklogItem[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'prohibido' | 'error'>('cargando');

  const cargar = useCallback(() => {
    api
      .backlog(filtro)
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
        <ListTodo className="h-5 w-5 text-marca-azul" />
        <h1 className="text-lg font-semibold text-texto-fuerte">Backlog</h1>
      </div>

      <NuevoItem onCreado={cargar} />

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
        <div className="h-32 animate-pulse rounded-2xl bg-panel" />
      ) : estado === 'prohibido' ? (
        <Aviso texto="Esta sección es solo para el perfil de programador." />
      ) : estado === 'error' ? (
        <Aviso texto="No se pudo cargar. Intenta de nuevo." />
      ) : (items?.length ?? 0) === 0 ? (
        <Aviso texto="No hay ítems con este filtro." />
      ) : (
        <div className="space-y-2">
          {items!.map((it) => (
            <ItemCard key={it.id} it={it} onCambio={cargar} />
          ))}
        </div>
      )}
    </div>
  );
}

function NuevoItem({ onCreado }: { onCreado: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadBacklog>('MEDIA');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function agregar() {
    if (titulo.trim().length < 2) {
      setError('Escribe un título.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.crearBacklog({ titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, prioridad });
      setTitulo('');
      setDescripcion('');
      setPrioridad('MEDIA');
      onCreado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo agregar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl bg-panel p-4 shadow-card">
      <input className={inputCls} placeholder="Nuevo pendiente…" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
      <textarea
        className={cn(inputCls, 'min-h-16 resize-y')}
        placeholder="Descripción (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        maxLength={3000}
      />
      <div className="flex items-center justify-between gap-2">
        <select className={cn(inputCls, 'w-auto')} value={prioridad} onChange={(e) => setPrioridad(e.target.value as PrioridadBacklog)}>
          {PRIORIDADES.map((p) => (
            <option key={p.clave} value={p.clave}>
              Prioridad: {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={agregar}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg bg-marca-azul px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Agregar
        </button>
      </div>
      {error && <p className="text-xs text-marca-rojo">{error}</p>}
    </div>
  );
}

function ItemCard({ it, onCambio }: { it: BacklogItem; onCambio: () => void }) {
  const [busy, setBusy] = useState(false);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(it.titulo);
  const [descripcion, setDescripcion] = useState(it.descripcion ?? '');
  const [prioridad, setPrioridad] = useState<PrioridadBacklog>(it.prioridad);
  const [error, setError] = useState('');

  async function run(fn: () => Promise<unknown>) {
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

  if (editando) {
    return (
      <div className="space-y-2 rounded-2xl bg-panel p-4 shadow-card">
        <input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
        <textarea className={cn(inputCls, 'min-h-16 resize-y')} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={3000} placeholder="Descripción (opcional)" />
        <div className="flex items-center justify-between gap-2">
          <select className={cn(inputCls, 'w-auto')} value={prioridad} onChange={(e) => setPrioridad(e.target.value as PrioridadBacklog)}>
            {PRIORIDADES.map((p) => (
              <option key={p.clave} value={p.clave}>
                Prioridad: {p.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setEditando(false)} disabled={busy} className="rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-texto-suave hover:bg-fondo disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={() => run(() => api.actualizarBacklog(it.id, { titulo: titulo.trim(), descripcion: descripcion.trim(), prioridad }).then(() => setEditando(false)))}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Guardar
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-marca-rojo">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className={cn('text-sm font-medium text-texto-fuerte', it.estado === 'HECHO' && 'line-through opacity-60')}>{it.titulo}</p>
        <div className="flex shrink-0 gap-1">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', PRIORIDAD_CLS[it.prioridad])}>
            {PRIORIDADES.find((p) => p.clave === it.prioridad)?.label}
          </span>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ESTADO_CLS[it.estado])}>
            {ESTADOS.find((e) => e.clave === it.estado)?.label}
          </span>
        </div>
      </div>
      {it.descripcion && <p className="whitespace-pre-wrap text-[13px] text-texto-suave">{it.descripcion}</p>}
      {it.origenReporteId && <p className="mt-1 text-[10px] text-texto-suave">Originado de un reporte</p>}

      {error && <p className="mt-2 text-xs text-marca-rojo">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {ESTADOS.map((e) => (
          <button
            key={e.clave}
            onClick={() => e.clave !== it.estado && run(() => api.actualizarBacklog(it.id, { estado: e.clave }))}
            disabled={busy}
            className={cn(
              'rounded-lg px-2 py-1 text-[11px] font-medium disabled:opacity-50',
              e.clave === it.estado ? 'bg-marca-azul text-white' : 'border border-borde text-texto-suave hover:bg-fondo',
            )}
          >
            {e.label}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={() => setEditando(true)} disabled={busy} className="grid h-7 w-7 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo disabled:opacity-50" title="Editar">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => run(() => api.borrarBacklog(it.id))} disabled={busy} className="grid h-7 w-7 place-items-center rounded-lg text-texto-suave hover:text-marca-rojo disabled:opacity-50" title="Eliminar">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
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
