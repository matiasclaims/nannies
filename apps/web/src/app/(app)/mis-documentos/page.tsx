'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, Check, Trash2, ExternalLink } from 'lucide-react';
import { api, ApiError, type DocumentoNannie } from '@/lib/api';
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
        <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={elegir} />
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

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}
