'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Plus, X, FileText, Pencil, Trash2, Paperclip, Upload } from 'lucide-react';
import {
  api,
  type IncidenteResumen,
  type IncidenteOpciones,
  type GuardarIncidente,
  type DocumentoIncidente,
  type CategoriaDocIncidente,
} from '@/lib/api';

const CATEGORIAS_DOC: { valor: CategoriaDocIncidente; etiqueta: string }[] = [
  { valor: 'COMPROBANTE_PAGO', etiqueta: 'Comprobante de pago' },
  { valor: 'ESTUDIOS', etiqueta: 'Estudios' },
  { valor: 'MEDICAMENTOS', etiqueta: 'Compra de medicamentos' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];
const etiquetaCategoria = (c: string) => CATEGORIAS_DOC.find((x) => x.valor === c)?.etiqueta ?? c;

const archivoADataURL = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('No se pudo leer el archivo.'));
    r.readAsDataURL(file);
  });

const inputCls =
  'w-full rounded-lg border border-borde bg-white px-2.5 py-1.5 text-sm outline-none focus:border-marca-azul';

const fechaHoraCorta = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Sección "Reportes de incidente" en la ficha de la familia (coordinación).
 *  Lista los reportes y permite crear/editar/ver el PDF. */
export function ReportesIncidenteFamilia({ familiaId }: { familiaId: string }) {
  const [lista, setLista] = useState<IncidenteResumen[] | null>(null);
  const [modal, setModal] = useState<{ editarId?: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await api.incidentesDeFamilia(familiaId));
    } catch {
      setLista([]);
    }
  }, [familiaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este reporte de incidente? Esta acción no se puede deshacer.')) return;
    await api.eliminarIncidente(id).catch(() => undefined);
    await cargar();
  }

  return (
    <div className="rounded-2xl bg-panel p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-texto-fuerte">
          <AlertTriangle className="h-4 w-4 text-marca-azul" /> Reportes de incidente
        </h2>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-1 rounded-lg bg-marca-azul px-2.5 py-1 text-xs font-semibold text-white hover:brightness-95"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo reporte
        </button>
      </div>

      {lista == null ? (
        <div className="h-10 animate-pulse rounded-lg bg-fondo" />
      ) : lista.length === 0 ? (
        <p className="text-xs text-texto-suave">
          Sin reportes de incidente. Se registran aquí y en el expediente de la nannie (aplique o no la cobertura médica).
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-borde p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-texto-fuerte">
                  {r.menor}
                  {r.coberturaAplico && (
                    <span className="ml-2 rounded-full bg-marca-azul/10 px-2 py-0.5 text-[10px] font-semibold text-marca-azul">
                      Cobertura aplicada
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-texto-suave">
                  {fechaHoraCorta(r.fechaHoraIncidente)} · Nannie: {r.nannie ?? '—'}
                </p>
                {r.diagnostico && <p className="mt-0.5 truncate text-xs text-texto-suave">Dx: {r.diagnostico}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={`/reporte-incidente/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-[11px] font-medium text-texto-suave hover:bg-fondo"
                  title="Ver / imprimir PDF"
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </a>
                <button
                  onClick={() => setModal({ editarId: r.id })}
                  className="rounded-lg border border-borde p-1.5 text-texto-suave hover:bg-fondo"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => eliminar(r.id)}
                  className="rounded-lg border border-borde p-1.5 text-marca-rojo hover:bg-marca-rojo/10"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <IncidenteModal
          familiaId={familiaId}
          editarId={modal.editarId}
          onCerrar={() => setModal(null)}
          onGuardado={async () => {
            setModal(null);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

type FormState = {
  servicioId: string;
  ninoId: string;
  nannieId: string;
  nannieNombre: string;
  paqueteId: string;
  paqueteResumen: string;
  fechaHoraIncidente: string; // datetime-local
  lugar: string;
  relatoNannie: string;
  medidasInmediatas: string;
  evolucionMenor: string;
  doctor: string;
  fechaConsulta: string; // date
  diagnostico: string;
  tratamiento: string;
  documentacionEntregada: string;
  medidasNannies: string;
  coberturaAplico: boolean;
  coberturaImporte: string;
  anexos: string;
};

const vacio: FormState = {
  servicioId: '', ninoId: '', nannieId: '', nannieNombre: '', paqueteId: '', paqueteResumen: '',
  fechaHoraIncidente: '', lugar: '', relatoNannie: '', medidasInmediatas: '', evolucionMenor: '',
  doctor: '', fechaConsulta: '', diagnostico: '', tratamiento: '', documentacionEntregada: '',
  medidasNannies: '', coberturaAplico: false, coberturaImporte: '', anexos: '',
};

function IncidenteModal({
  familiaId,
  editarId,
  onCerrar,
  onGuardado,
}: {
  familiaId: string;
  editarId?: string;
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [opciones, setOpciones] = useState<IncidenteOpciones | null>(null);
  const [f, setF] = useState<FormState>(vacio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [ops, det] = await Promise.all([
        api.incidenteOpciones(familiaId),
        editarId ? api.incidente(editarId) : Promise.resolve(null),
      ]);
      if (!vivo) return;
      setOpciones(ops);
      if (det) {
        setF({
          servicioId: det.servicioId ?? '',
          ninoId: det.ninoId ?? '',
          nannieId: det.nannieId ?? '',
          nannieNombre: det.nannie ?? '',
          paqueteId: det.paqueteId ?? '',
          paqueteResumen: det.paquete
            ? `Paquete #${det.paquete.folio} · ${det.paquete.horasTotales} h · contratado ${det.paquete.fechaContratacion}`
            : '',
          fechaHoraIncidente: det.fechaHoraIncidente.slice(0, 16),
          lugar: det.lugar,
          relatoNannie: det.relatoNannie,
          medidasInmediatas: det.medidasInmediatas ?? '',
          evolucionMenor: det.evolucionMenor ?? '',
          doctor: det.doctor ?? '',
          fechaConsulta: det.fechaConsulta ?? '',
          diagnostico: det.diagnostico ?? '',
          tratamiento: det.tratamiento ?? '',
          documentacionEntregada: det.documentacionEntregada ?? '',
          medidasNannies: det.medidasNannies ?? '',
          coberturaAplico: det.coberturaAplico,
          coberturaImporte: det.coberturaImporte != null ? String(det.coberturaImporte) : '',
          anexos: det.anexos ?? '',
        });
      }
    })().catch(() => setError('No se pudieron cargar los datos del formulario.'));
    return () => {
      vivo = false;
    };
  }, [familiaId, editarId]);

  // Al elegir un servicio, autollena fecha, lugar, nannie y paquete.
  function elegirServicio(servicioId: string) {
    const s = opciones?.servicios.find((x) => x.id === servicioId);
    setF((p) => ({
      ...p,
      servicioId,
      ...(s
        ? {
            fechaHoraIncidente: p.fechaHoraIncidente || `${s.fecha}T${s.horaInicio}`,
            lugar: p.lugar || s.lugar,
            nannieId: s.nannieId ?? '',
            nannieNombre: s.nannieNombre ?? '',
            paqueteId: s.paqueteId ?? '',
            paqueteResumen: s.paqueteResumen ?? '',
          }
        : { nannieId: '', nannieNombre: '', paqueteId: '', paqueteResumen: '' }),
    }));
  }

  const importeInvalido = useMemo(
    () => f.coberturaAplico && f.coberturaImporte !== '' && Number.isNaN(Number(f.coberturaImporte)),
    [f.coberturaAplico, f.coberturaImporte],
  );

  async function guardar() {
    setError('');
    if (!f.fechaHoraIncidente) return setError('Indica la fecha y hora del incidente.');
    if (!f.lugar.trim()) return setError('Indica el lugar del incidente.');
    if (!f.relatoNannie.trim()) return setError('Captura el relato de la nannie.');
    if (importeInvalido) return setError('El importe de la cobertura no es un número válido.');
    setBusy(true);
    const t = (s: string) => (s.trim() ? s.trim() : undefined);
    const body: GuardarIncidente = {
      familiaId,
      servicioId: f.servicioId || undefined,
      ninoId: f.ninoId || undefined,
      nannieId: f.nannieId || undefined,
      paqueteId: f.paqueteId || undefined,
      fechaHoraIncidente: new Date(f.fechaHoraIncidente).toISOString(),
      lugar: f.lugar.trim(),
      relatoNannie: f.relatoNannie.trim(),
      medidasInmediatas: t(f.medidasInmediatas),
      evolucionMenor: t(f.evolucionMenor),
      doctor: t(f.doctor),
      fechaConsulta: f.fechaConsulta || undefined,
      diagnostico: t(f.diagnostico),
      tratamiento: t(f.tratamiento),
      documentacionEntregada: t(f.documentacionEntregada),
      medidasNannies: t(f.medidasNannies),
      coberturaAplico: f.coberturaAplico,
      coberturaImporte: f.coberturaAplico && f.coberturaImporte !== '' ? Number(f.coberturaImporte) : undefined,
      anexos: t(f.anexos),
    };
    try {
      if (editarId) await api.editarIncidente(editarId, body);
      else await api.crearIncidente(body);
      await onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el reporte.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onCerrar} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-borde bg-panel p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-texto-fuerte">{editarId ? 'Editar' : 'Nuevo'} reporte de incidente</h3>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte"><X className="h-4 w-4" /></button>
        </div>

        {opciones == null ? (
          <div className="h-40 animate-pulse rounded-lg bg-fondo" />
        ) : (
          <div className="space-y-3">
            <Campo label="Servicio relacionado (autollena fecha, lugar, nannie y paquete)">
              <select value={f.servicioId} onChange={(e) => elegirServicio(e.target.value)} className={inputCls}>
                <option value="">— Sin servicio (capturar a mano) —</option>
                {opciones.servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.etiqueta}</option>
                ))}
              </select>
            </Campo>

            <div className="grid grid-cols-2 gap-2">
              <Campo label="Menor">
                <select value={f.ninoId} onChange={(e) => set('ninoId', e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {opciones.ninos.map((n) => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Nannie a cargo">
                <input value={f.nannieNombre || '—'} readOnly className={`${inputCls} bg-fondo text-texto-suave`} />
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Campo label="Fecha y hora del incidente *">
                <input type="datetime-local" value={f.fechaHoraIncidente} onChange={(e) => set('fechaHoraIncidente', e.target.value)} className={inputCls} />
              </Campo>
              <Campo label="Lugar del incidente *">
                <input value={f.lugar} onChange={(e) => set('lugar', e.target.value)} className={inputCls} />
              </Campo>
            </div>

            <Campo label="Incidente relatado por la nannie *">
              <textarea value={f.relatoNannie} onChange={(e) => set('relatoNannie', e.target.value)} rows={4} className={inputCls} />
            </Campo>

            <Campo label="Medidas aplicadas inmediatamente">
              <textarea value={f.medidasInmediatas} onChange={(e) => set('medidasInmediatas', e.target.value)} rows={2} className={inputCls} />
            </Campo>
            <Campo label="Evolución del menor">
              <textarea value={f.evolucionMenor} onChange={(e) => set('evolucionMenor', e.target.value)} rows={2} className={inputCls} />
            </Campo>

            <div className="grid grid-cols-2 gap-2">
              <Campo label="Doctor que valoró">
                <input value={f.doctor} onChange={(e) => set('doctor', e.target.value)} className={inputCls} />
              </Campo>
              <Campo label="Fecha de la consulta">
                <input type="date" value={f.fechaConsulta} onChange={(e) => set('fechaConsulta', e.target.value)} className={inputCls} />
              </Campo>
            </div>

            <Campo label="Diagnóstico">
              <textarea value={f.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} rows={2} className={inputCls} />
            </Campo>
            <Campo label="Tratamiento indicado">
              <textarea value={f.tratamiento} onChange={(e) => set('tratamiento', e.target.value)} rows={2} className={inputCls} />
            </Campo>
            <Campo label="Documentación entregada">
              <input value={f.documentacionEntregada} onChange={(e) => set('documentacionEntregada', e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Medidas implementadas por Nannies (revisión interna / penalización)">
              <textarea value={f.medidasNannies} onChange={(e) => set('medidasNannies', e.target.value)} rows={2} className={inputCls} />
            </Campo>

            <div className="rounded-xl border border-borde p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-texto-fuerte">
                <input type="checkbox" checked={f.coberturaAplico} onChange={(e) => set('coberturaAplico', e.target.checked)} />
                Aplicó la cobertura médica
              </label>
              {f.coberturaAplico && (
                <div className="mt-2 space-y-2">
                  <Campo label="Importe cubierto (MXN)">
                    <input inputMode="decimal" value={f.coberturaImporte} onChange={(e) => set('coberturaImporte', e.target.value)} className={inputCls} placeholder="850" />
                  </Campo>
                  {f.paqueteResumen ? (
                    <p className="text-[11px] text-texto-suave">Se referirá al {f.paqueteResumen.toLowerCase()}.</p>
                  ) : (
                    <p className="text-[11px] text-texto-suave">Elige un servicio con paquete para citar el paquete contratado.</p>
                  )}
                </div>
              )}
            </div>

            <Campo label="Anexos (lista, p. ej. receta médica, comprobante de pago)">
              <input value={f.anexos} onChange={(e) => set('anexos', e.target.value)} className={inputCls} />
            </Campo>

            {editarId ? (
              <DocumentosRespaldo incidenteId={editarId} />
            ) : (
              <div className="rounded-xl border border-dashed border-borde p-3">
                <p className="flex items-center gap-1.5 text-[11px] text-texto-suave">
                  <Paperclip className="h-3.5 w-3.5" /> Guarda el reporte para adjuntar documentos de respaldo
                  (comprobantes, estudios, medicamentos).
                </p>
              </div>
            )}

            {error && <p className="rounded-lg bg-marca-rojo/10 px-3 py-2 text-xs text-marca-rojo">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onCerrar} className="rounded-lg border border-borde px-3 py-1.5 text-sm text-texto-suave hover:bg-fondo">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={busy}
                className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] text-texto-suave">{label}</span>
      {children}
    </label>
  );
}

/** Documentos de respaldo del reporte (comprobantes, estudios, medicamentos).
 *  Internos de coordinación; no se incluyen en la hoja para los papás. */
function DocumentosRespaldo({ incidenteId }: { incidenteId: string }) {
  const [docs, setDocs] = useState<DocumentoIncidente[] | null>(null);
  const [categoria, setCategoria] = useState<CategoriaDocIncidente>('COMPROBANTE_PAGO');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      setDocs(await api.documentosIncidente(incidenteId));
    } catch {
      setDocs([]);
    }
  }, [incidenteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function subir(file: File) {
    setError('');
    if (file.size > 8 * 1024 * 1024) {
      setError('El archivo no debe pasar de 8 MB.');
      return;
    }
    setSubiendo(true);
    try {
      const contenido = await archivoADataURL(file);
      await api.subirDocumentoIncidente(incidenteId, { categoria, nombreArchivo: file.name, contenido });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el documento.');
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function eliminar(docId: string) {
    if (!window.confirm('¿Eliminar este documento de respaldo?')) return;
    await api.eliminarDocumentoIncidente(incidenteId, docId).catch(() => undefined);
    await cargar();
  }

  return (
    <div className="rounded-xl border border-borde p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-texto-fuerte">
        <Paperclip className="h-4 w-4 text-marca-azul" /> Documentos de respaldo
      </p>
      <p className="mb-2 text-[11px] text-texto-suave">
        Evidencia que soporta el incidente (comprobante de pago, estudios, compra de medicamentos). Solo para
        coordinación; no se incluyen en la hoja de los papás. PDF o imagen, máx. 8 MB.
      </p>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaDocIncidente)}
          className={inputCls + ' w-auto'}
        >
          {CATEGORIAS_DOC.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.etiqueta}
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void subir(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={subiendo}
          className="inline-flex items-center gap-1 rounded-lg border border-marca-azul/50 px-3 py-1.5 text-xs font-medium text-marca-azul hover:bg-marca-azul/5 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" /> {subiendo ? 'Subiendo…' : 'Subir documento'}
        </button>
      </div>

      {error && <p className="mb-2 text-[11px] text-marca-rojo">{error}</p>}

      {docs == null ? (
        <div className="h-8 animate-pulse rounded-lg bg-fondo" />
      ) : docs.length === 0 ? (
        <p className="text-[11px] text-texto-suave">Sin documentos adjuntos.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-fondo px-2.5 py-1.5">
              <div className="min-w-0">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 truncate text-xs font-medium text-marca-azul hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" /> {d.nombreArchivo}
                </a>
                <p className="text-[10px] text-texto-suave">
                  {etiquetaCategoria(d.categoria)} · {d.subidoPor}
                </p>
              </div>
              <button
                type="button"
                onClick={() => eliminar(d.id)}
                className="shrink-0 rounded-lg border border-borde p-1 text-marca-rojo hover:bg-marca-rojo/10"
                title="Eliminar documento"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
