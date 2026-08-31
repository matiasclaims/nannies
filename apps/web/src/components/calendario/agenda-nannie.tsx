'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Check, X, ClipboardList, HeartPulse, NotebookPen, QrCode, Star } from 'lucide-react';
import {
  api,
  type Servicio,
  type Disponibilidad,
  type RespuestaOferta,
  type FichaFamilia,
  type NinoPerfil,
  type MiResumenEval,
} from '@/lib/api';
import { ANIMOS } from '@/lib/dominio';
import { EncuestaLinkModal } from '@/components/encuesta-link-modal';
import { TIPO_LABEL, ESTADO_DISPONIBILIDAD, edadLabel } from '@/lib/dominio';
import type { DiaSemana } from '@/lib/semana';
import { cn } from '@/lib/utils';
import { FormMarcarDisponibilidad } from './form-marcar-disponibilidad';
import { HoraSelect } from '@/components/hora-select';

/** Vista de la nannie: sus ofertas arriba + su semana como agenda + marcar disponibilidad. */
export function AgendaNannie({ dias }: { dias: DiaSemana[] }) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [dispon, setDispon] = useState<Disponibilidad[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [marcando, setMarcando] = useState(false);
  const [fichaServ, setFichaServ] = useState<Servicio | null>(null);
  const [reporteServ, setReporteServ] = useState<Servicio | null>(null);
  const [encuestaServ, setEncuestaServ] = useState<Servicio | null>(null);
  const [miEval, setMiEval] = useState<MiResumenEval | null>(null);

  useEffect(() => {
    api.miResumenEval().then(setMiEval).catch(() => undefined);
  }, []);

  const desde = dias[0]?.fecha;
  const hasta = dias[dias.length - 1]?.fecha;

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const [s, d] = await Promise.all([
        api.listarServicios({ desde, hasta }),
        api.listarDisponibilidad({ desde, hasta }),
      ]);
      setServicios(s);
      setDispon(d);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function responder(id: string, r: RespuestaOferta) {
    await api.responderOferta(id, r).catch(() => undefined);
    await cargar();
  }

  async function completar(id: string) {
    await api.completarServicio(id).catch(() => undefined);
    await cargar();
  }

  if (estado === 'error') {
    return <Aviso texto="No se pudo cargar tu agenda. ¿Está arriba la API?" />;
  }

  const ofertas = servicios.filter((s) => s.estado === 'OFERTADO');
  const enDia = (iso: string, dia: string) => iso.slice(0, 10) === dia;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Mi calificación de papás (M6): solo el promedio global, sin nombres. */}
      {miEval && miEval.total > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-panel p-3 shadow-card">
          <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
          <p className="text-sm text-texto-fuerte">
            Tu calificación de papás: <strong>{miEval.promedio}</strong>/10
            <span className="text-texto-suave"> · {miEval.total} {miEval.total === 1 ? 'opinión' : 'opiniones'}</span>
          </p>
        </div>
      )}
      {/* Ofertas pendientes — cuadritos con ✓/✗ (ágil aunque haya muchas).
          No se muestran datos de la familia: solo tipo, fecha, horario y zona. */}
      {ofertas.length > 0 && (
        <div className="rounded-2xl bg-marca-azul/10 p-4">
          <p className="mb-2 text-sm font-semibold text-[#0b6b7d]">
            Tienes {ofertas.length} {ofertas.length === 1 ? 'oferta' : 'ofertas'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ofertas.map((s) => (
              <div key={s.id} className="flex flex-col rounded-xl bg-panel p-2.5 shadow-card">
                <p className="text-xs font-semibold leading-tight text-texto-fuerte">
                  {TIPO_LABEL[s.tipoServicio]}
                </p>
                <p className="mt-0.5 text-[11px] capitalize text-texto-suave">{fechaCorta(s.fecha)}</p>
                <p className="text-[11px] text-texto-suave">
                  {s.horaInicio}–{s.horaFin}
                </p>
                <p className="truncate text-[11px] text-texto-suave">{s.zona}</p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => responder(s.id, 'ACEPTO')}
                    title="Aceptar"
                    className="flex flex-1 items-center justify-center rounded-lg bg-marca-verde py-1.5 text-white transition hover:brightness-95"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => responder(s.id, 'RECHAZO')}
                    title="Rechazar"
                    className="flex flex-1 items-center justify-center rounded-lg border border-borde py-1.5 text-marca-rojo transition hover:bg-fondo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marcar disponibilidad */}
      <div className="rounded-2xl bg-panel p-4 shadow-card">
        <button
          onClick={() => setMarcando((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-marca-azul py-3.5 text-base font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          {marcando ? 'Cerrar' : '+ Marcar mi disponibilidad'}
        </button>
        {marcando && (
          <div className="mt-3">
            <FormMarcarDisponibilidad
              fechaInicial={desde ?? ''}
              onGuardado={async () => {
                setMarcando(false);
                await cargar();
              }}
            />
          </div>
        )}
      </div>

      {/* Mi semana (agenda) */}
      <div className="rounded-2xl bg-panel p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-texto-fuerte">Mi semana</h3>
        {estado === 'cargando' ? (
          <div className="h-32 animate-pulse rounded-xl bg-fondo" />
        ) : (
          <div className="space-y-2">
            {dias.map((d) => {
              const servs = servicios.filter((s) => enDia(s.fecha, d.fecha));
              const bloques = dispon.filter((x) => enDia(x.fecha, d.fecha));
              const vacio = servs.length === 0 && bloques.length === 0;
              return (
                <div
                  key={d.fecha}
                  className={cn(
                    'rounded-xl border border-borde p-3',
                    d.esHoy && 'border-marca-azul/40 bg-marca-azul/5',
                  )}
                >
                  <p
                    className={cn(
                      'mb-1 text-xs font-semibold capitalize',
                      d.esHoy ? 'text-marca-azul' : 'text-texto-suave',
                    )}
                  >
                    {d.etiqueta}
                  </p>
                  {vacio ? (
                    <p className="text-xs text-texto-suave">Sin actividad</p>
                  ) : (
                    <div className="space-y-1">
                      {servs.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-texto-fuerte">
                            <span className="font-medium">{TIPO_LABEL[s.tipoServicio]}</span>{' '}
                            {s.horaInicio}–{s.horaFin} · {s.zona}
                          </p>
                          {(s.estado === 'ACEPTADO' || s.estado === 'COMPLETADO') && (
                            <button
                              onClick={() => setFichaServ(s)}
                              className="flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
                            >
                              <ClipboardList className="h-3.5 w-3.5" /> Ver ficha
                            </button>
                          )}
                          {s.estado === 'ACEPTADO' && (
                            <button
                              onClick={() => completar(s.id)}
                              className="rounded-lg bg-marca-verde px-2.5 py-1 text-xs font-semibold text-white hover:brightness-95"
                            >
                              Marcar terminado
                            </button>
                          )}
                          {s.estado === 'COMPLETADO' && (
                            <span className="rounded-full bg-marca-rojo/20 px-2 py-0.5 text-[11px] font-semibold text-[#a3312f]">
                              Terminado
                            </span>
                          )}
                          {(s.estado === 'ACEPTADO' || s.estado === 'COMPLETADO') && (
                            <button
                              onClick={() => setReporteServ(s)}
                              className="flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
                            >
                              <NotebookPen className="h-3.5 w-3.5" /> Reporte
                            </button>
                          )}
                          {(s.estado === 'ACEPTADO' || s.estado === 'COMPLETADO') && (
                            <button
                              onClick={() => setEncuestaServ(s)}
                              className="flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
                            >
                              <QrCode className="h-3.5 w-3.5" /> Encuesta
                            </button>
                          )}
                        </div>
                      ))}
                      {bloques.map((b) => (
                        <BloqueDispon key={b.id} b={b} onCambio={cargar} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {fichaServ && <FichaFamiliaModal servicio={fichaServ} onCerrar={() => setFichaServ(null)} />}
      {reporteServ && (
        <ReporteModal
          servicio={reporteServ}
          onCerrar={() => setReporteServ(null)}
          onGuardado={() => {
            setReporteServ(null);
            cargar();
          }}
        />
      )}
      {encuestaServ && <EncuestaLinkModal servicioId={encuestaServ.id} onCerrar={() => setEncuestaServ(null)} />}
    </div>
  );
}

/** M6 · 6.1 — La nannie escribe/edita el reporte de UN servicio. */
function ReporteModal({
  servicio,
  onCerrar,
  onGuardado,
}: {
  servicio: Servicio;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [actividades, setActividades] = useState('');
  const [animoNino, setAnimoNino] = useState<string>('');
  const [incidentes, setIncidentes] = useState('');
  const [notas, setNotas] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .reporteDeServicio(servicio.id)
      .then((r) => {
        if (r) {
          setActividades(r.actividades);
          setAnimoNino(r.animoNino);
          setIncidentes(r.incidentes ?? '');
          setNotas(r.notas ?? '');
        }
      })
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, [servicio.id]);

  async function guardar() {
    if (actividades.trim().length < 3 || !animoNino) {
      setError('Escribe las actividades y elige el ánimo del peque.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await api.guardarReporte(servicio.id, {
        actividades: actividades.trim(),
        animoNino,
        incidentes: incidentes.trim() || undefined,
        notas: notas.trim() || undefined,
      });
      onGuardado();
    } catch {
      setError('No se pudo guardar el reporte.');
      setGuardando(false);
    }
  }

  const campo = 'w-full rounded-lg border border-borde bg-panel px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-2xl bg-panel p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">Reporte del servicio</h2>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-texto-suave">
          {TIPO_LABEL[servicio.tipoServicio]} · {servicio.horaInicio}–{servicio.horaFin}
        </p>
        {cargando ? (
          <p className="py-6 text-center text-sm text-texto-suave">Cargando…</p>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Actividades realizadas *</span>
              <textarea
                value={actividades}
                onChange={(e) => setActividades(e.target.value)}
                rows={3}
                className={campo}
                placeholder="¿Qué hicieron durante el servicio?"
              />
            </label>
            <div>
              <span className="mb-1 block text-xs font-medium text-texto-suave">Ánimo del peque *</span>
              <div className="flex flex-wrap gap-2">
                {ANIMOS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAnimoNino(a)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium',
                      animoNino === a ? 'border-marca-azul bg-marca-azul/10 text-marca-azul' : 'border-borde text-texto-suave',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Incidentes u observaciones</span>
              <textarea value={incidentes} onChange={(e) => setIncidentes(e.target.value)} rows={2} className={campo} placeholder="Opcional" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Notas / recomendaciones</span>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={campo} placeholder="Opcional" />
            </label>
            {error && <p className="text-xs text-marca-rojo">{error}</p>}
            <button
              onClick={guardar}
              disabled={guardando}
              className="w-full rounded-lg bg-marca-azul px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar reporte'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Ficha OPERATIVA de la familia (Opción A): la nannie solo ve lo necesario para
 *  el servicio; sin apellidos ni contactos (el backend los omite). */
function FichaFamiliaModal({ servicio, onCerrar }: { servicio: Servicio; onCerrar: () => void }) {
  const [ficha, setFicha] = useState<FichaFamilia | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.fichaFamilia(servicio.familiaId).then(setFicha).catch(() => setError('No se pudo cargar la ficha.'));
  }, [servicio.familiaId]);

  const adulto = ficha?.adultoResponsablePresente;
  // Dirección EFECTIVA: la del servicio si se capturó (ubicación distinta al
  // domicilio); si no, la del cardex de la familia.
  const otraUbicacion = Boolean(servicio.direccion?.trim());
  const direccion = servicio.direccion?.trim() || ficha?.direccion || null;
  const zona = servicio.zona || ficha?.zona || null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onCerrar} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-borde bg-panel p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-texto-fuerte">Ficha de la familia</h3>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte"><X className="h-4 w-4" /></button>
        </div>

        {error ? (
          <p className="text-sm text-marca-rojo">{error}</p>
        ) : !ficha ? (
          <div className="h-32 animate-pulse rounded-xl bg-fondo" />
        ) : (
          <div className="space-y-3 text-sm">
            {direccion && (
              <div>
                <p className="flex items-center gap-1.5 text-[11px] text-texto-suave">
                  Dirección
                  {otraUbicacion && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      distinta al domicilio
                    </span>
                  )}
                </p>
                <p className="text-texto-fuerte">{direccion}</p>
              </div>
            )}
            {zona && <Info label="Zona" valor={zona} />}
            {adulto != null && <Info label="Adulto responsable durante el servicio" valor={adulto ? 'Sí' : 'No'} />}
            {ficha.mascotas && <Info label="Mascotas" valor={ficha.mascotas} />}
            {ficha.reglasEspecificas && <Info label="Reglas de la casa" valor={ficha.reglasEspecificas} />}
            {ficha.expectativas && <Info label="Expectativas del servicio" valor={ficha.expectativas} />}
            {ficha.areasATrabajar && ficha.areasATrabajar.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] text-texto-suave">Áreas a trabajar</p>
                <div className="flex flex-wrap gap-1.5">
                  {ficha.areasATrabajar.map((a) => (
                    <span key={a} className="rounded-full bg-marca-azul/10 px-2 py-0.5 text-[11px] font-medium text-marca-azul">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-borde pt-3">
              <p className="mb-2 text-xs font-semibold text-texto-fuerte">
                {ficha.ninos.length === 1 ? 'Peque' : 'Peques'} ({ficha.ninos.length})
              </p>
              <div className="space-y-2">
                {ficha.ninos.length === 0 ? (
                  <p className="text-xs text-texto-suave">Sin datos operativos del peque.</p>
                ) : (
                  ficha.ninos.map((n, i) => <NinoOperativo key={n.id} nino={n} idx={i} />)
                )}
              </div>
            </div>

            <p className="border-t border-borde pt-2 text-[11px] text-texto-suave">
              Vista operativa: por privacidad no se muestran apellidos ni contactos de la familia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NinoOperativo({ nino, idx }: { nino: NinoPerfil; idx: number }) {
  return (
    <div className="rounded-xl border border-borde p-3">
      <p className="mb-1 text-xs font-semibold text-texto-fuerte">
        Peque {idx + 1}{edadLabel(nino.edad, nino.edadMeses) ? ` · ${edadLabel(nino.edad, nino.edadMeses)}` : ''}
      </p>
      {nino.salud && (
        <p className="mb-1 flex items-start gap-1.5 rounded-lg bg-[#5B292D]/10 px-2 py-1 text-xs text-[#5B292D]">
          <HeartPulse className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span><strong>Salud / alergias:</strong> {nino.salud}</span>
        </p>
      )}
      {nino.conductasRiesgo && (
        <p className="mb-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
          <strong>Conductas de riesgo:</strong> {nino.conductasRiesgo}
        </p>
      )}
      {nino.rutinas && <CampoNino label="Rutinas" valor={nino.rutinas} />}
      {nino.necesidades && <CampoNino label="Necesidades" valor={nino.necesidades} />}
      {nino.caracter && <CampoNino label="Carácter" valor={nino.caracter} />}
      {nino.reaccionAnteLoNuevo && <CampoNino label="Reacción ante lo nuevo" valor={nino.reaccionAnteLoNuevo} />}
      {nino.tematicasInteres && <CampoNino label="Temáticas de interés" valor={nino.tematicasInteres} />}
      {nino.restriccionesPantalla && <CampoNino label="Restricciones de pantalla" valor={nino.restriccionesPantalla} />}
      {nino.autorizacionCambioPanal != null && (
        <CampoNino label="Cambio de pañal / baño" valor={nino.autorizacionCambioPanal ? 'Autorizado' : 'No autorizado'} />
      )}
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-texto-suave">{label}</p>
      <p className="text-texto-fuerte">{valor}</p>
    </div>
  );
}

function CampoNino({ label, valor }: { label: string; valor: string }) {
  return (
    <p className="text-xs text-texto-suave">
      <strong className="text-texto-fuerte">{label}:</strong> {valor}
    </p>
  );
}

/** Un bloque de disponibilidad con opción de editar la hora o eliminarlo
 *  (corregir un error de captura). */
function BloqueDispon({ b, onCambio }: { b: Disponibilidad; onCambio: () => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [ini, setIni] = useState(b.horaInicio);
  const [fin, setFin] = useState(b.horaFin);
  const [busy, setBusy] = useState(false);

  async function guardar() {
    if (fin <= ini) return;
    setBusy(true);
    await api.editarDisponibilidad(b.id, { horaInicio: ini, horaFin: fin }).catch(() => undefined);
    setEditando(false);
    await onCambio();
    setBusy(false);
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar este bloque de disponibilidad?')) return;
    setBusy(true);
    await api.eliminarDisponibilidad(b.id).catch(() => undefined);
    await onCambio();
    setBusy(false);
  }

  const inputCls =
    'w-[5.5rem] rounded-lg border border-borde bg-white px-2 py-1 text-xs outline-none focus:border-marca-azul';

  if (editando) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <HoraSelect value={ini} onChange={setIni} className={inputCls} />
        <span className="text-texto-suave">–</span>
        <HoraSelect value={fin} onChange={setFin} className={inputCls} />
        <button onClick={guardar} disabled={busy} className="text-marca-verde disabled:opacity-50" title="Guardar">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={() => setEditando(false)} className="text-texto-suave" title="Cancelar">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn('rounded-full px-2 py-0.5 font-medium', ESTADO_DISPONIBILIDAD[b.estado].clase)}>
        {ESTADO_DISPONIBILIDAD[b.estado].label}
      </span>
      <span className="text-texto-suave">
        {b.horaInicio}–{b.horaFin}
      </span>
      <button onClick={() => setEditando(true)} className="text-texto-suave hover:text-marca-azul" title="Editar">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={eliminar} disabled={busy} className="text-texto-suave hover:text-marca-rojo disabled:opacity-50" title="Eliminar">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
