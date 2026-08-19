'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, X, TriangleAlert } from 'lucide-react';
import {
  api,
  ApiError,
  type BandejaNannie,
  type ReglaIncidencia,
  type PenalidadPendiente,
  type ServicioDescuento,
} from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { Seccion } from '@/components/seccion';
import { cn } from '@/lib/utils';

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const ESTADO_INC: Record<string, string> = {
  ACUMULANDO: 'contando',
  APLICADA: 'aplicada',
  DESCARTADA: 'descartada',
  CONDONADA: 'condonada',
};

/** Sección de incidencias del expediente: pendientes, progreso, historial y
 *  registro. La aplicación de Baja/Prueba es solo de la Directora. */
export function IncidenciasNannie({
  nannieId,
  nombre,
  esDirectora,
}: {
  nannieId: string;
  nombre: string;
  esDirectora: boolean;
}) {
  const [data, setData] = useState<BandejaNannie | null>(null);
  const [registrar, setRegistrar] = useState(false);
  const [aplicandoDescuento, setAplicandoDescuento] = useState<PenalidadPendiente | null>(null);

  const cargar = useCallback(() => {
    api.incidenciasDeNannie(nannieId).then(setData).catch(() => setData(null));
  }, [nannieId]);
  useEffect(cargar, [cargar]);

  async function aplicar(ocurrenciasIds: string[]) {
    await api.aplicarIncidencia(nannieId, ocurrenciasIds).catch(() => undefined);
    cargar();
  }
  async function descartar(id: string) {
    await api.descartarIncidencia(id).catch(() => undefined);
    cargar();
  }
  async function condonar(ocurrenciasIds: string[]) {
    await api.condonarIncidencia(nannieId, ocurrenciasIds).catch(() => undefined);
    cargar();
  }

  const registrarBtn = (
    <button
      onClick={() => setRegistrar(true)}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
    >
      <Plus className="h-3.5 w-3.5" /> Registrar
    </button>
  );

  return (
    <Seccion icon={TriangleAlert} title="Incidencias" tint="vino" headerRight={registrarBtn} defaultOpen={false}>
      {!data ? (
        <div className="h-16 animate-pulse rounded-xl bg-fondo" />
      ) : data.pendientes.length === 0 && data.progreso.length === 0 && data.historial.length === 0 ? (
        <p className="text-xs text-texto-suave">Sin incidencias registradas.</p>
      ) : (
        <div className="space-y-3">
          {data.pendientes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-suave">Penalizaciones pendientes</p>
              {data.pendientes.map((p) => {
                const esEstado = p.tipo === 'BAJA' || p.tipo === 'PRUEBA';
                return (
                  <div key={p.clave} className="flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-900">{p.consecuenciaTexto}</p>
                      <p className="text-[11px] text-amber-800">{p.descripcion}</p>
                    </div>
                    {!esDirectora ? (
                      <span className="shrink-0 text-[10px] text-amber-700">Solo Directora</span>
                    ) : esEstado ? (
                      <button
                        onClick={() => aplicar(p.ocurrenciasIds)}
                        className="shrink-0 rounded-lg bg-[#5B292D] px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                      >
                        Aplicar
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => setAplicandoDescuento(p)}
                          className="rounded-lg bg-marca-azul px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-95"
                        >
                          Aplicar al pago
                        </button>
                        <button
                          onClick={() => condonar(p.ocurrenciasIds)}
                          title="Deja pasar el descuento pero queda registrado en el historial"
                          className="rounded-lg border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          Condonar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data.progreso.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.progreso.map((g, i) => (
                <span key={i} className="rounded-full bg-fondo px-2.5 py-1 text-[11px] text-texto-suave">
                  {g.etiqueta}: <strong className="text-texto-fuerte">{g.actual}/{g.umbral}</strong>
                </span>
              ))}
            </div>
          )}

          {data.historial.length > 0 && (
            <div className="divide-y divide-borde">
              {data.historial.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-2 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-texto-fuerte">
                      {h.situacion}
                      {h.noCulposa && (
                        <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          Justificada
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-texto-suave">
                      {fechaCorta(h.fecha)} · {h.registradaPor} · {ESTADO_INC[h.estado] ?? h.estado}
                      {h.nota ? ` · ${h.nota}` : ''}
                    </p>
                  </div>
                  {h.estado === 'ACUMULANDO' && (
                    <button
                      onClick={() => descartar(h.id)}
                      className="shrink-0 text-[10px] text-texto-suave hover:text-marca-rojo"
                    >
                      Descartar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {registrar && (
        <RegistrarModal
          nannieId={nannieId}
          nombre={nombre}
          onClose={() => setRegistrar(false)}
          onListo={() => {
            setRegistrar(false);
            cargar();
          }}
        />
      )}

      {aplicandoDescuento && (
        <DescuentoModal
          nannieId={nannieId}
          penalidad={aplicandoDescuento}
          onClose={() => setAplicandoDescuento(null)}
          onListo={() => {
            setAplicandoDescuento(null);
            cargar();
          }}
        />
      )}
    </Seccion>
  );
}

function DescuentoModal({
  nannieId,
  penalidad,
  onClose,
  onListo,
}: {
  nannieId: string;
  penalidad: PenalidadPendiente;
  onClose: () => void;
  onListo: () => void;
}) {
  const [servicios, setServicios] = useState<ServicioDescuento[]>([]);
  const [servicioId, setServicioId] = useState('');
  const [monto, setMonto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.serviciosDescuento(nannieId).then(setServicios).catch(() => undefined);
  }, [nannieId]);

  function elegir(id: string) {
    setServicioId(id);
    const s = servicios.find((x) => x.servicioId === id);
    if (s && s.pago != null) {
      const sug = penalidad.pct ? Math.round((penalidad.pct / 100) * s.pago * 100) / 100 : s.pago;
      setMonto(String(sug));
    } else setMonto('');
  }

  async function aplicar() {
    const m = Number(monto);
    if (!servicioId || !m || m <= 0) return;
    setBusy(true);
    setError('');
    try {
      await api.aplicarIncidencia(nannieId, penalidad.ocurrenciasIds, { servicioId, monto: m });
      onListo();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo aplicar el descuento.');
      setBusy(false);
    }
  }

  const input = 'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-panel p-5 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">Aplicar descuento al pago</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-texto-suave hover:bg-fondo">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{penalidad.consecuenciaTexto}</p>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Servicio al que se aplica</span>
          <select value={servicioId} onChange={(e) => elegir(e.target.value)} className={input}>
            <option value="">Elige un servicio…</option>
            {servicios.map((s) => (
              <option key={s.servicioId} value={s.servicioId} disabled={s.pago == null}>
                {TIPO_LABEL[s.tipo]} · {fechaCorta(s.fecha)} · pago {s.pago == null ? 'pendiente' : money(s.pago)}
                {s.descuentoActual > 0 ? ` · ya −${money(s.descuentoActual)}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Monto a descontar del pago</span>
          <input type="number" min={1} value={monto} onChange={(e) => setMonto(e.target.value)} className={input} placeholder="$" />
          <span className="mt-1 block text-[11px] text-texto-suave">
            Sugerido según la regla; puedes ajustarlo. Reduce el pago de la nannie (el margen sube).
          </span>
        </label>

        {error && <p className="mt-2 text-sm text-marca-rojo">{error}</p>}

        <button
          onClick={aplicar}
          disabled={busy || !servicioId || !monto}
          className="mt-3 w-full rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Aplicando…' : 'Aplicar descuento'}
        </button>
      </div>
    </div>
  );
}

function RegistrarModal({
  nannieId,
  nombre,
  onClose,
  onListo,
}: {
  nannieId: string;
  nombre: string;
  onClose: () => void;
  onListo: () => void;
}) {
  const [reglas, setReglas] = useState<ReglaIncidencia[]>([]);
  const [regla, setRegla] = useState<number | ''>('');
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.catalogoIncidencias().then(setReglas).catch(() => undefined);
  }, []);

  const sel = reglas.find((r) => r.numero === regla);
  const notaReq = sel?.notaObligatoria ?? false;

  async function guardar() {
    if (regla === '' || (notaReq && !nota.trim())) return;
    setBusy(true);
    setError('');
    try {
      await api.registrarIncidencia(nannieId, Number(regla), nota.trim() || undefined);
      onListo();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar.');
      setBusy(false);
    }
  }

  const input = 'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-panel p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">Registrar incidencia · {nombre}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-texto-suave hover:bg-fondo">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">Regla</span>
          <select value={regla} onChange={(e) => setRegla(e.target.value === '' ? '' : Number(e.target.value))} className={input}>
            <option value="">Elige la incidencia…</option>
            <optgroup label="Incidencias">
              {reglas.filter((r) => !r.noCulposa).map((r) => (
                <option key={r.numero} value={r.numero}>
                  {r.situacion}
                </option>
              ))}
            </optgroup>
            <optgroup label="No culposas (justificadas · no penalizan)">
              {reglas.filter((r) => r.noCulposa).map((r) => (
                <option key={r.numero} value={r.numero}>
                  {r.situacion}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        {sel && (
          <p className="mt-2 rounded-lg bg-fondo px-3 py-2 text-[11px] text-texto-suave">
            Consecuencia: <strong className="text-texto-fuerte">{sel.consecuenciaTexto}</strong>
          </p>
        )}

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-texto-suave">
            Nota {notaReq ? '(obligatoria)' : '(opcional)'}
          </span>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={cn(input, 'resize-none')} placeholder="Detalle de lo que pasó" />
        </label>

        {error && <p className="mt-2 text-sm text-marca-rojo">{error}</p>}

        <button
          onClick={guardar}
          disabled={busy || regla === '' || (notaReq && !nota.trim())}
          className="mt-3 w-full rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Registrando…' : 'Registrar'}
        </button>
      </div>
    </div>
  );
}

function fechaCorta(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
