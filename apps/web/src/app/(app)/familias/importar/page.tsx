'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { api, ApiError, type FamiliaLite } from '@/lib/api';
import { parseImportacion, generarPlantilla, type FilaImport } from '@/lib/importar-familias';
import { cn } from '@/lib/utils';

export default function ImportarFamiliasPage() {
  const [texto, setTexto] = useState('');
  const [existentes, setExistentes] = useState<FamiliaLite[]>([]);
  const [filas, setFilas] = useState<FilaImport[] | null>(null);
  const [errorParse, setErrorParse] = useState('');
  const [incluirDup, setIncluirDup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<{ creadas: number; total: number } | null>(null);
  const [errorApi, setErrorApi] = useState('');

  useEffect(() => {
    api.listarFamilias().then(setExistentes).catch(() => setExistentes([]));
  }, []);

  const revisar = useCallback(() => {
    setResultado(null);
    setErrorApi('');
    const { filas: f, error } = parseImportacion(texto, existentes);
    setErrorParse(error ?? '');
    setFilas(error ? null : f);
  }, [texto, existentes]);

  function descargarPlantilla() {
    const blob = new Blob([generarPlantilla()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-familias.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((t) => setTexto(t));
  }

  const listas = filas?.filter((f) => f.estado === 'ok') ?? [];
  const errores = filas?.filter((f) => f.estado === 'error') ?? [];
  const duplicadas = filas?.filter((f) => f.estado === 'duplicado') ?? [];
  const aCrear = incluirDup ? [...listas, ...duplicadas] : listas;

  async function confirmar() {
    setBusy(true);
    setErrorApi('');
    try {
      const r = await api.importarFamilias(aCrear.map((f) => f.familia));
      setResultado({ creadas: r.creadas, total: r.total });
      setFilas(null);
      setTexto('');
    } catch (e) {
      setErrorApi(e instanceof ApiError ? e.message : 'No se pudo importar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/familias" className="inline-flex items-center gap-1 text-xs text-texto-suave hover:text-marca-azul">
        <ArrowLeft className="h-3.5 w-3.5" /> Familias
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-texto-fuerte">Importar familias</h1>
        <p className="text-sm text-texto-suave">
          Pega las respuestas del formulario (copiadas de Google Sheets) o sube un CSV. Revisa la vista previa antes de crear nada.
        </p>
      </div>

      {resultado ? (
        <div className="rounded-2xl bg-panel p-6 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-10 w-10 text-marca-verde" />
          <p className="mt-2 text-lg font-semibold text-texto-fuerte">
            Se importaron {resultado.creadas} de {resultado.total} familias.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/familias" className="rounded-lg bg-marca-azul px-4 py-2 text-sm font-semibold text-white">Ver familias</Link>
            <button onClick={() => setResultado(null)} className="rounded-lg border border-borde px-4 py-2 text-sm text-texto-suave hover:bg-fondo">Importar más</button>
          </div>
        </div>
      ) : (
        <>
          {/* Paso 1: pegar / subir */}
          <div className="rounded-2xl bg-panel p-4 shadow-card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-texto-fuerte">1. Pega o sube los datos</span>
              <div className="flex gap-2">
                <button onClick={descargarPlantilla} className="flex items-center gap-1 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-medium text-texto-suave hover:bg-fondo">
                  <Download className="h-3.5 w-3.5" /> Plantilla CSV
                </button>
                <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-medium text-texto-suave hover:bg-fondo">
                  <Upload className="h-3.5 w-3.5" /> Subir CSV
                  <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={subirArchivo} />
                </label>
              </div>
            </div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={7}
              placeholder="Pega aquí. La primera fila deben ser los encabezados (contacto, apellido, plaza, …). Descarga la plantilla para ver el formato."
              className="w-full rounded-xl border border-borde bg-white px-3 py-2 font-mono text-xs outline-none focus:border-marca-azul"
            />
            <p className="mt-1.5 text-[11px] text-texto-suave">
              Obligatorios: <strong>contacto</strong> y <strong>plaza</strong> (Toluca o Querétaro). Cada peque se crea solo si trae <code>peque1_nombre</code>. Las columnas que no reconozca se ignoran.
            </p>
            <button
              onClick={revisar}
              disabled={!texto.trim()}
              className="mt-3 rounded-lg bg-marca-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Revisar
            </button>
            {errorParse && <p className="mt-2 text-xs text-marca-rojo">{errorParse}</p>}
          </div>

          {/* Paso 2: vista previa */}
          {filas && (
            <div className="rounded-2xl bg-panel p-4 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-texto-fuerte">2. Vista previa</span>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <Contador n={listas.length} label="listas" clase="bg-marca-verde/20 text-[#3b6d11]" />
                  {duplicadas.length > 0 && <Contador n={duplicadas.length} label="posibles duplicados" clase="bg-amber-100 text-amber-700" />}
                  {errores.length > 0 && <Contador n={errores.length} label="con error" clase="bg-marca-rojo/10 text-marca-rojo" />}
                </div>
              </div>

              <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-borde">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-fondo text-texto-suave">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Familia</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borde">
                    {filas.map((f) => (
                      <tr key={f.indice} className={cn(f.estado === 'error' && 'bg-marca-rojo/5')}>
                        <td className="px-3 py-2 align-top text-texto-suave">{f.indice}</td>
                        <td className="px-3 py-2 align-top">
                          <span className="text-texto-fuerte">{f.resumen}</span>
                          {f.errores.length > 0 && (
                            <ul className="mt-0.5 list-disc pl-4 text-[11px] text-marca-rojo">
                              {f.errores.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <EstadoBadge estado={f.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {duplicadas.length > 0 && (
                <label className="mt-3 flex items-center gap-2 text-xs text-texto-fuerte">
                  <input type="checkbox" checked={incluirDup} onChange={(e) => setIncluirDup(e.target.checked)} className="h-4 w-4" />
                  Importar también los {duplicadas.length} posibles duplicados
                </label>
              )}

              {errorApi && <p className="mt-2 text-xs text-marca-rojo">{errorApi}</p>}

              <div className="mt-3 flex items-center justify-end gap-2">
                <span className="text-xs text-texto-suave">Se crearán {aCrear.length} familias (las de error se omiten).</span>
                <button
                  onClick={confirmar}
                  disabled={busy || aCrear.length === 0}
                  className="rounded-lg bg-marca-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? 'Importando…' : `Confirmar importación (${aCrear.length})`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Contador({ n, label, clase }: { n: number; label: string; clase: string }) {
  return <span className={cn('rounded-full px-2 py-0.5 font-semibold', clase)}>{n} {label}</span>;
}

function EstadoBadge({ estado }: { estado: FilaImport['estado'] }) {
  if (estado === 'ok') return <span className="inline-flex items-center gap-1 text-[#3b6d11]"><CheckCircle2 className="h-3.5 w-3.5" /> Lista</span>;
  if (estado === 'duplicado') return <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Duplicado</span>;
  return <span className="inline-flex items-center gap-1 text-marca-rojo"><XCircle className="h-3.5 w-3.5" /> Con error</span>;
}
