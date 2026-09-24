'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, Check, Trash2, ExternalLink, Users } from 'lucide-react';
import { api, ApiError, type DocumentoNannie, type ReferenciaNannie, type TipoReferencia } from '@/lib/api';
import { CATALOGO_DOCUMENTOS, CATALOGO_CURSOS, type ItemChecklist } from '@/lib/nannie-catalogos';
import { cn } from '@/lib/utils';

const MAX_MB = 8;

export default function MisDocumentosPage() {
  const [subidos, setSubidos] = useState<DocumentoNannie[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'prohibido' | 'error'>('cargando');
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api
      .misDocumentos()
      .then((d) => {
        setSubidos(d);
        setEstado('ok');
      })
      .catch((e) => setEstado(e instanceof ApiError && e.status === 403 ? 'prohibido' : 'error'));
  }, []);
  useEffect(cargar, [cargar]);

  const porClave = new Map((subidos ?? []).map((d) => [d.clave, d]));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-texto-fuerte">Mis documentos</h1>
        <p className="text-sm text-texto-suave">Sube tus documentos y constancias (PDF o foto, máx {MAX_MB} MB).</p>
      </div>

      {error && <p className="rounded-xl bg-marca-rojo/10 px-3 py-2 text-sm text-marca-rojo">{error}</p>}

      {estado === 'prohibido' ? (
        <Aviso texto="Esta sección es para las nannies (tu propio expediente)." />
      ) : estado === 'error' ? (
        <Aviso texto="No se pudo cargar. Intenta de nuevo." />
      ) : estado === 'cargando' ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel" />
      ) : (
        <>
          <Grupo titulo="Documentos" items={CATALOGO_DOCUMENTOS} porClave={porClave} onCambio={cargar} onError={setError} />
          <ReferenciasPanel onError={setError} />
          <Grupo titulo="Cursos (constancias)" items={CATALOGO_CURSOS} porClave={porClave} onCambio={cargar} onError={setError} />
        </>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  items,
  porClave,
  onCambio,
  onError,
}: {
  titulo: string;
  items: ItemChecklist[];
  porClave: Map<string, DocumentoNannie>;
  onCambio: () => void;
  onError: (m: string) => void;
}) {
  const hechos = items.filter((i) => porClave.has(i.clave)).length;
  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texto-fuerte">{titulo}</h2>
        <span className="rounded-full bg-fondo px-2 py-0.5 text-[11px] font-semibold text-texto-suave">
          {hechos}/{items.length}
        </span>
      </div>
      <div className="divide-y divide-borde">
        {items.map((it) => (
          <ItemDoc key={it.clave} item={it} doc={porClave.get(it.clave)} onCambio={onCambio} onError={onError} />
        ))}
      </div>
    </div>
  );
}

function ItemDoc({
  item,
  doc,
  onCambio,
  onError,
}: {
  item: ItemChecklist;
  doc?: DocumentoNannie;
  onCambio: () => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onError('');
    if (file.size > MAX_MB * 1024 * 1024) return onError(`"${file.name}" pasa de ${MAX_MB} MB.`);
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(true);
      try {
        await api.subirMiDocumento(item.clave, file.name, String(reader.result));
        onCambio();
      } catch (err) {
        onError(err instanceof ApiError ? err.message : 'No se pudo subir el archivo.');
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function quitar() {
    setBusy(true);
    await api.borrarMiDocumento(item.clave).catch(() => undefined);
    setBusy(false);
    onCambio();
  }

  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <div className="flex min-w-0 items-start gap-2">
        <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', doc ? 'bg-marca-verde text-white' : 'bg-fondo text-texto-suave')}>
          {doc ? <Check className="h-3 w-3" strokeWidth={3} /> : <FileText className="h-3 w-3" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-texto-fuerte">{item.nombre}</p>
          {doc ? (
            <p className="truncate text-[11px] text-texto-suave">{doc.nombreArchivo}</p>
          ) : (
            item.fuente && <p className="text-[11px] text-texto-suave">{item.fuente}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept={
            item.clave === 'formato_zonas'
              ? 'application/pdf,image/*,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
              : 'application/pdf,image/*'
          }
          className="hidden"
          onChange={elegir}
        />
        {doc?.url && (
          <a href={doc.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo" title="Ver">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-medium text-marca-azul hover:bg-fondo disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" /> {busy ? '…' : doc ? 'Reemplazar' : 'Subir'}
        </button>
        {doc && (
          <button onClick={quitar} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg text-texto-suave hover:text-marca-rojo disabled:opacity-50" title="Quitar">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

interface SlotRef {
  tipo: TipoReferencia;
  orden: number;
  nombre: string;
  telefono: string;
  aniosConocer: string;
  empresa: string;
  puesto: string;
  parentesco: string;
}
const vacio = (tipo: TipoReferencia, orden: number): SlotRef => ({
  tipo,
  orden,
  nombre: '',
  telefono: '',
  aniosConocer: '',
  empresa: '',
  puesto: '',
  parentesco: '',
});
const inputCls =
  'w-full rounded-lg border border-borde bg-white px-2.5 py-1.5 text-sm outline-none focus:border-marca-azul';

/** Referencias laborales/personales: datos capturados por la nannie (2 de cada). */
function ReferenciasPanel({ onError }: { onError: (m: string) => void }) {
  const [slots, setSlots] = useState<SlotRef[]>([
    vacio('LABORAL', 1),
    vacio('LABORAL', 2),
    vacio('PERSONAL', 1),
    vacio('PERSONAL', 2),
  ]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .misReferencias()
      .then((refs) => {
        setSlots((prev) =>
          prev.map((s) => {
            const r = refs.find((x) => x.tipo === s.tipo && x.orden === s.orden);
            return r
              ? {
                  ...s,
                  nombre: r.nombre ?? '',
                  telefono: r.telefono ?? '',
                  aniosConocer: r.aniosConocer != null ? String(r.aniosConocer) : '',
                  empresa: r.empresa ?? '',
                  puesto: r.puesto ?? '',
                  parentesco: r.parentesco ?? '',
                }
              : s;
          }),
        );
      })
      .catch(() => undefined);
  }, []);

  const set = (idx: number, campo: keyof SlotRef, val: string) =>
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [campo]: val } : s)));

  async function guardar() {
    setBusy(true);
    setMsg('');
    onError('');
    try {
      const payload: ReferenciaNannie[] = slots.map((s) => {
        const n = Number(s.aniosConocer);
        return {
          tipo: s.tipo,
          orden: s.orden,
          nombre: s.nombre.trim() || null,
          telefono: s.telefono.trim() || null,
          aniosConocer: s.aniosConocer.trim() && Number.isFinite(n) ? Math.max(0, Math.round(n)) : null,
          empresa: s.empresa.trim() || null,
          puesto: s.puesto.trim() || null,
          parentesco: s.parentesco.trim() || null,
        };
      });
      await api.guardarMisReferencias(payload);
      setMsg('Referencias guardadas.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'No se pudieron guardar las referencias.');
    } finally {
      setBusy(false);
    }
  }

  const idx = (tipo: TipoReferencia, orden: number) => slots.findIndex((s) => s.tipo === tipo && s.orden === orden);

  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <Users className="h-4 w-4 text-marca-azul" />
        <h2 className="text-sm font-semibold text-texto-fuerte">Referencias</h2>
      </div>
      <p className="mb-3 text-[11px] text-texto-suave">
        Captura tus 2 referencias laborales y 2 personales (ya no se suben como archivo).
      </p>

      <p className="mb-1 text-xs font-semibold text-texto-suave">Laborales</p>
      <div className="mb-3 space-y-3">
        {[1, 2].map((orden) => {
          const i = idx('LABORAL', orden);
          const s = slots[i];
          return (
            <div key={`lab${orden}`} className="rounded-xl border border-borde p-3">
              <p className="mb-2 text-[11px] font-semibold text-texto-suave">Laboral {orden}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input className={inputCls} placeholder="Nombre" value={s.nombre} onChange={(e) => set(i, 'nombre', e.target.value)} />
                <input className={inputCls} placeholder="Teléfono" value={s.telefono} onChange={(e) => set(i, 'telefono', e.target.value)} />
                <input className={inputCls} placeholder="Empresa" value={s.empresa} onChange={(e) => set(i, 'empresa', e.target.value)} />
                <input className={inputCls} placeholder="Puesto" value={s.puesto} onChange={(e) => set(i, 'puesto', e.target.value)} />
                <input className={inputCls} placeholder="Años de conocerle" inputMode="numeric" value={s.aniosConocer} onChange={(e) => set(i, 'aniosConocer', e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mb-1 text-xs font-semibold text-texto-suave">Personales</p>
      <div className="space-y-3">
        {[1, 2].map((orden) => {
          const i = idx('PERSONAL', orden);
          const s = slots[i];
          return (
            <div key={`per${orden}`} className="rounded-xl border border-borde p-3">
              <p className="mb-2 text-[11px] font-semibold text-texto-suave">Personal {orden}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input className={inputCls} placeholder="Nombre" value={s.nombre} onChange={(e) => set(i, 'nombre', e.target.value)} />
                <input className={inputCls} placeholder="Teléfono" value={s.telefono} onChange={(e) => set(i, 'telefono', e.target.value)} />
                <input className={inputCls} placeholder="Parentesco / relación" value={s.parentesco} onChange={(e) => set(i, 'parentesco', e.target.value)} />
                <input className={inputCls} placeholder="Años de conocerle" inputMode="numeric" value={s.aniosConocer} onChange={(e) => set(i, 'aniosConocer', e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        {msg && <span className="text-xs text-[#3b6d11]">{msg}</span>}
        <button
          onClick={guardar}
          disabled={busy}
          className="rounded-lg bg-marca-azul px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar referencias'}
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
