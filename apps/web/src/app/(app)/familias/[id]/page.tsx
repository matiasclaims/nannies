'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2, Plus, HeartPulse, X, Check, QrCode, Package, ChevronDown, List, CalendarDays, ListChecks } from 'lucide-react';
import { api, type PerfilFamilia, type ServicioHist, type NinoPerfil, type NinoInput, type FamiliaInput, type NannieLite } from '@/lib/api';
import { ESTADO_SERVICIO, edadLabel, etiquetaServicio } from '@/lib/dominio';
import { AREAS_TRABAJO, CONSENTIMIENTOS } from '@/lib/familia-catalogo';
import { EncuestaLinkModal } from '@/components/encuesta-link-modal';
import { PlaneacionModal } from '@/components/planeacion-modal';
import { PaqueteFamilia } from '@/components/paquete-familia';
import { HoraSelect } from '@/components/hora-select';
import { inicioMes, diasDeMes, sumarMeses, etiquetaMes, baseHoyMX, hoyMX } from '@/lib/semana';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-lg border border-borde bg-white px-2.5 py-1.5 text-sm outline-none focus:border-marca-azul';

const ESTADO_FAMILIA: Record<string, string> = {
  ACTIVA: 'bg-marca-verde/20 text-[#3b6d11]',
  INACTIVA: 'bg-amber-100 text-amber-700',
  SUSPENDIDA: 'bg-marca-rojo/10 text-marca-rojo',
};

export default function PerfilFamiliaPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PerfilFamilia | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [nuevoNino, setNuevoNino] = useState(false);
  const [editFamilia, setEditFamilia] = useState(false);
  const [encuestaSid, setEncuestaSid] = useState<string | null>(null);
  const [planeacionSid, setPlaneacionSid] = useState<string | null>(null);
  const [nannies, setNannies] = useState<NannieLite[]>([]);

  useEffect(() => {
    api.listarNannies().then(setNannies).catch(() => undefined);
  }, []);

  const cargar = useCallback(async () => {
    try {
      setData(await api.perfilFamilia(id));
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (estado === 'error') return <Aviso texto="No se pudo cargar el perfil de la familia." />;
  if (!data) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-2xl bg-panel" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/familias" className="inline-flex items-center gap-1 text-xs text-texto-suave hover:text-marca-azul">
        <ArrowLeft className="h-3.5 w-3.5" /> Familias
      </Link>

      {/* Datos de la familia (cardex) */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-texto-fuerte">
              {data.nombreContacto} {data.apellido ?? ''}
            </h1>
            {data.estado === 'SUSPENDIDA' ? (
              <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO_FAMILIA.SUSPENDIDA)}>
                Suspendida
              </span>
            ) : data.inactiva ? (
              <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO_FAMILIA.INACTIVA)}>
                Inactiva · {data.diasSinServicio} días sin servicio
              </span>
            ) : (
              <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO_FAMILIA.ACTIVA)}>
                Activa
              </span>
            )}
          </div>
          <button
            onClick={() => setEditFamilia(true)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-medium text-texto-suave hover:bg-fondo"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Dato label="Plaza" valor={data.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'} />
          <Dato label="Zona" valor={data.zona ?? '—'} />
          <Dato label="Teléfono" valor={data.telefono ?? '—'} />
          <Dato label="Correo" valor={data.email ?? '—'} />
          <Dato label="Emergencia" valor={data.numeroEmergencia ?? '—'} />
          <Dato label="Adulto durante servicio" valor={data.adultoResponsablePresente == null ? '—' : data.adultoResponsablePresente ? 'Sí' : 'No'} />
          <div className="col-span-2">
            <Dato label="Dirección" valor={data.direccion ?? '—'} />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <Dato label="Mascotas" valor={data.mascotas ?? '—'} />
          </div>
        </div>

        {(data.expectativas || data.reglasEspecificas) && (
          <div className="mt-3 space-y-1.5 border-t border-borde pt-3">
            {data.expectativas && <CampoTexto label="Expectativas" valor={data.expectativas} />}
            {data.reglasEspecificas && <CampoTexto label="Reglas de la casa" valor={data.reglasEspecificas} />}
          </div>
        )}

        {data.areasATrabajar.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] text-texto-suave">Áreas a trabajar</p>
            <div className="flex flex-wrap gap-1.5">
              {data.areasATrabajar.map((a) => (
                <span key={a} className="rounded-full bg-marca-azul/10 px-2 py-0.5 text-[11px] font-medium text-marca-azul">{a}</span>
              ))}
            </div>
          </div>
        )}

        {data.autorizacionAudiovisual && (
          <div className="mt-3"><CampoTexto label="Autorización audiovisual" valor={data.autorizacionAudiovisual} /></div>
        )}

        <div className="mt-3 border-t border-borde pt-3">
          <p className="mb-1.5 text-[11px] text-texto-suave">Consentimientos</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {CONSENTIMIENTOS.map((c) => (
              <ConsentBadge key={c.clave} label={c.label} on={Boolean(data[c.clave])} />
            ))}
          </div>
        </div>

      </div>

      {/* Paquete de horas (M2/M5): registrar / gestionar dentro del expediente */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-texto-fuerte">Paquete de horas</h2>
        <PaqueteFamilia
          familiaId={data.id}
          plaza={data.plaza}
          zona={data.zona}
          paquete={data.paqueteActivo}
          paquetesEnEspera={data.paquetesEnEspera}
          nannies={nannies}
          onCambio={cargar}
        />
      </div>

      {/* Próximas sesiones: ajustar horario/fecha sin ir al calendario de cada nannie. */}
      <ProximasSesiones servicios={data.servicios} onCambio={cargar} onPlaneacion={setPlaneacionSid} />

      {editFamilia && (
        <EditarFamiliaModal
          familia={data}
          onCerrar={() => setEditFamilia(false)}
          onGuardado={async () => { setEditFamilia(false); await cargar(); }}
        />
      )}

      {/* Niños */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">Niños ({data.ninos.length})</h2>
          <button
            onClick={() => setNuevoNino((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-marca-azul px-2.5 py-1 text-xs font-semibold text-white hover:brightness-95"
          >
            <Plus className="h-3.5 w-3.5" /> {nuevoNino ? 'Cerrar' : 'Agregar niño'}
          </button>
        </div>
        {nuevoNino && (
          <NinoForm
            onGuardar={async (body) => {
              await api.crearNino(id, body).catch(() => undefined);
              setNuevoNino(false);
              await cargar();
            }}
            onCancelar={() => setNuevoNino(false)}
          />
        )}
        <div className="space-y-2">
          {data.ninos.length === 0 && !nuevoNino ? (
            <p className="text-xs text-texto-suave">Aún no hay niños registrados.</p>
          ) : (
            data.ninos.map((n) => <NinoCard key={n.id} nino={n} onCambio={cargar} />)
          )}
        </div>
      </div>

      {/* Servicios: lista (agrupada por folio) o calendario mensual. */}
      <ServiciosFamilia servicios={data.servicios} onEncuesta={setEncuestaSid} onPlaneacion={setPlaneacionSid} />

      {/* Bitácora */}
      <Bitacora familiaId={id} notas={data.notas} onCambio={cargar} />

      {encuestaSid && <EncuestaLinkModal servicioId={encuestaSid} onCerrar={() => setEncuestaSid(null)} />}
      {planeacionSid && <PlaneacionModal servicioId={planeacionSid} onCerrar={() => setPlaneacionSid(null)} />}
    </div>
  );
}

function NinoCard({ nino, onCambio }: { nino: NinoPerfil; onCambio: () => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  // La nannie no recibe los campos identificables (vienen undefined).
  const identificable = nino.nombre !== undefined;

  if (editando) {
    return (
      <NinoForm
        inicial={nino}
        onGuardar={async (body) => {
          await api.editarNino(nino.id, body).catch(() => undefined);
          setEditando(false);
          await onCambio();
        }}
        onCancelar={() => setEditando(false)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-borde p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-texto-fuerte">
          {identificable ? (
            <>
              {nino.nombre} {nino.apellidos ?? ''}
              {edadLabel(nino.edad, nino.edadMeses) && (
                <span className="text-texto-suave"> · {edadLabel(nino.edad, nino.edadMeses)}</span>
              )}
              {nino.genero && <span className="text-texto-suave"> · {nino.genero}</span>}
            </>
          ) : (
            <span className="text-texto-suave">Datos del menor (vista operativa)</span>
          )}
        </p>
        {identificable && (
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setEditando(true)} className="text-texto-suave hover:text-marca-azul" title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={async () => {
                if (window.confirm('¿Eliminar este niño?')) {
                  await api.eliminarNino(nino.id).catch(() => undefined);
                  await onCambio();
                }
              }}
              className="text-texto-suave hover:text-marca-rojo"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {nino.salud && (
        <p className="mb-1 flex items-start gap-1.5 rounded-lg bg-[#5B292D]/10 px-2 py-1 text-xs text-[#5B292D]">
          <HeartPulse className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span><strong>Salud / alergias:</strong> {nino.salud}</span>
        </p>
      )}
      {nino.rutinas && <CampoTexto label="Rutinas" valor={nino.rutinas} />}
      {nino.necesidades && <CampoTexto label="Necesidades" valor={nino.necesidades} />}
      {nino.caracter && <CampoTexto label="Carácter" valor={nino.caracter} />}
      {nino.reaccionAnteLoNuevo && <CampoTexto label="Reacción ante lo nuevo" valor={nino.reaccionAnteLoNuevo} />}
      {nino.tematicasInteres && <CampoTexto label="Temáticas de interés" valor={nino.tematicasInteres} />}
      {nino.restriccionesPantalla && <CampoTexto label="Restricciones de pantalla" valor={nino.restriccionesPantalla} />}
      {nino.conductasRiesgo && (
        <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
          <span><strong>Conductas de riesgo:</strong> {nino.conductasRiesgo}</span>
        </p>
      )}
      {nino.autorizacionCambioPanal != null && (
        <CampoTexto label="Cambio de pañal / baño" valor={nino.autorizacionCambioPanal ? 'Autorizado' : 'No autorizado'} />
      )}
    </div>
  );
}

function NinoForm({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: NinoPerfil;
  onGuardar: (body: NinoInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [f, setF] = useState<NinoInput>({
    nombre: inicial?.nombre ?? '',
    apellidos: inicial?.apellidos ?? '',
    edad: inicial?.edad ?? undefined,
    edadMeses: inicial?.edadMeses ?? undefined,
    genero: inicial?.genero ?? '',
    salud: inicial?.salud ?? '',
    rutinas: inicial?.rutinas ?? '',
    necesidades: inicial?.necesidades ?? '',
    caracter: inicial?.caracter ?? '',
    reaccionAnteLoNuevo: inicial?.reaccionAnteLoNuevo ?? '',
    tematicasInteres: inicial?.tematicasInteres ?? '',
    restriccionesPantalla: inicial?.restriccionesPantalla ?? '',
    conductasRiesgo: inicial?.conductasRiesgo ?? '',
    autorizacionCambioPanal: inicial?.autorizacionCambioPanal ?? undefined,
  });
  const [busy, setBusy] = useState(false);

  async function guardar() {
    if (!f.nombre?.trim()) return;
    setBusy(true);
    await onGuardar({
      nombre: f.nombre,
      apellidos: f.apellidos || undefined,
      edad: f.edad ? Number(f.edad) : undefined,
      edadMeses: f.edadMeses ? Number(f.edadMeses) : undefined,
      genero: f.genero || undefined,
      salud: f.salud || undefined,
      rutinas: f.rutinas || undefined,
      necesidades: f.necesidades || undefined,
      caracter: f.caracter || undefined,
      reaccionAnteLoNuevo: f.reaccionAnteLoNuevo || undefined,
      tematicasInteres: f.tematicasInteres || undefined,
      restriccionesPantalla: f.restriccionesPantalla || undefined,
      conductasRiesgo: f.conductasRiesgo || undefined,
      autorizacionCambioPanal: f.autorizacionCambioPanal,
    });
    setBusy(false);
  }

  return (
    <div className="mb-2 space-y-2 rounded-xl border border-marca-azul/40 bg-marca-azul/5 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input placeholder="Nombre(s)" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={cn(inputCls, 'sm:col-span-2')} />
        <input placeholder="Apellidos" value={f.apellidos} onChange={(e) => setF({ ...f, apellidos: e.target.value })} className={cn(inputCls, 'sm:col-span-2')} />
        <input type="number" min={0} max={18} placeholder="Años" value={f.edad ?? ''} onChange={(e) => setF({ ...f, edad: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
        <input type="number" min={0} max={11} placeholder="Meses" value={f.edadMeses ?? ''} onChange={(e) => setF({ ...f, edadMeses: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
        <input placeholder="Género" value={f.genero} onChange={(e) => setF({ ...f, genero: e.target.value })} className={cn(inputCls, 'sm:col-span-2')} />
      </div>
      <textarea placeholder="Salud / alergias / condiciones médicas" value={f.salud} onChange={(e) => setF({ ...f, salud: e.target.value })} rows={2} className={inputCls} />
      <textarea placeholder="Rutinas (siesta, comidas, clases…)" value={f.rutinas} onChange={(e) => setF({ ...f, rutinas: e.target.value })} rows={2} className={inputCls} />
      <textarea placeholder="Necesidades" value={f.necesidades} onChange={(e) => setF({ ...f, necesidades: e.target.value })} rows={2} className={inputCls} />
      <textarea placeholder="Carácter" value={f.caracter} onChange={(e) => setF({ ...f, caracter: e.target.value })} rows={2} className={inputCls} />
      <textarea placeholder="Reacción ante lo nuevo" value={f.reaccionAnteLoNuevo} onChange={(e) => setF({ ...f, reaccionAnteLoNuevo: e.target.value })} rows={2} className={inputCls} />
      <textarea placeholder="Temáticas de interés" value={f.tematicasInteres} onChange={(e) => setF({ ...f, tematicasInteres: e.target.value })} rows={2} className={inputCls} />
      <textarea placeholder="Restricciones de pantalla" value={f.restriccionesPantalla} onChange={(e) => setF({ ...f, restriccionesPantalla: e.target.value })} rows={2} className={inputCls} />
      <textarea placeholder="Conductas de riesgo" value={f.conductasRiesgo} onChange={(e) => setF({ ...f, conductasRiesgo: e.target.value })} rows={2} className={inputCls} />
      <label className="flex items-center gap-2 text-sm text-texto-fuerte">
        <input type="checkbox" checked={Boolean(f.autorizacionCambioPanal)} onChange={(e) => setF({ ...f, autorizacionCambioPanal: e.target.checked })} className="h-4 w-4" />
        Autoriza cambio de pañal / baño
      </label>
      <div className="flex gap-2">
        <button onClick={guardar} disabled={busy || !f.nombre?.trim()} className="rounded-lg bg-marca-azul px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancelar} className="rounded-lg border border-borde px-3 py-1.5 text-xs text-texto-suave">Cancelar</button>
      </div>
    </div>
  );
}

function Bitacora({
  familiaId,
  notas,
  onCambio,
}: {
  familiaId: string;
  notas: PerfilFamilia['notas'];
  onCambio: () => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);

  async function agregar() {
    if (!texto.trim()) return;
    setBusy(true);
    await api.crearNota(familiaId, texto.trim()).catch(() => undefined);
    setTexto('');
    await onCambio();
    setBusy(false);
  }

  return (
    <div className="rounded-2xl bg-panel p-5 shadow-card">
      <h2 className="text-sm font-semibold text-texto-fuerte">Bitácora</h2>
      <p className="mb-2 text-xs text-texto-suave">
        Notas y recomendaciones sobre la familia (conocimiento acumulado del equipo).
      </p>
      {notas.length > 0 && (
        <div className="mb-3 space-y-2">
          {notas.map((n) => (
            <div key={n.id} className="rounded-xl bg-fondo p-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-texto-fuerte">{n.texto}</p>
                <button
                  onClick={async () => {
                    await api.eliminarNota(n.id).catch(() => undefined);
                    await onCambio();
                  }}
                  className="shrink-0 text-texto-suave hover:text-marca-rojo"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-0.5 text-[11px] text-texto-suave">
                {n.autor ?? 'Equipo'} · {fechaCorta(n.fecha)}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()}
          placeholder="Agregar una nota…"
          className={cn(inputCls, 'flex-1')}
        />
        <button onClick={agregar} disabled={busy || !texto.trim()} className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          Agregar
        </button>
      </div>
    </div>
  );
}

function ConsentBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px]', on ? 'text-[#3b6d11]' : 'text-texto-suave')}>
      <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full', on ? 'bg-marca-verde text-white' : 'border border-borde')}>
        {on && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {label}
    </span>
  );
}

function EditarFamiliaModal({
  familia,
  onCerrar,
  onGuardado,
}: {
  familia: PerfilFamilia;
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [f, setF] = useState({
    nombreContacto: familia.nombreContacto ?? '',
    apellido: familia.apellido ?? '',
    plaza: familia.plaza,
    zona: familia.zona ?? '',
    telefono: familia.telefono ?? '',
    email: familia.email ?? '',
    numeroEmergencia: familia.numeroEmergencia ?? '',
    direccion: familia.direccion ?? '',
    expectativas: familia.expectativas ?? '',
    reglasEspecificas: familia.reglasEspecificas ?? '',
    adultoResponsablePresente: familia.adultoResponsablePresente,
    mascotas: familia.mascotas ?? '',
    autorizacionAudiovisual: familia.autorizacionAudiovisual ?? '',
    estado: familia.estado,
  });
  const [areas, setAreas] = useState<string[]>(familia.areasATrabajar ?? []);
  const [cons, setCons] = useState({
    consentimientoReglamento: familia.consentimientoReglamento,
    consentimientoMedico: familia.consentimientoMedico,
    consentimientoPrivacidad: familia.consentimientoPrivacidad,
    consentimientoConfidencialidad: familia.consentimientoConfidencialidad,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }) as typeof p);
  const toggleArea = (a: string) => setAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  async function guardar() {
    setBusy(true);
    setError('');
    const t = (s: string) => s.trim() || undefined;
    try {
      await api.editarFamilia(familia.id, {
        nombreContacto: t(f.nombreContacto),
        apellido: t(f.apellido),
        plaza: f.plaza,
        zona: t(f.zona),
        telefono: t(f.telefono),
        email: t(f.email),
        numeroEmergencia: t(f.numeroEmergencia),
        direccion: t(f.direccion),
        expectativas: t(f.expectativas),
        reglasEspecificas: t(f.reglasEspecificas),
        adultoResponsablePresente: f.adultoResponsablePresente ?? undefined,
        mascotas: t(f.mascotas),
        areasATrabajar: areas,
        autorizacionAudiovisual: t(f.autorizacionAudiovisual),
        ...cons,
        estado: f.estado,
      });
      // Solo cierra y recarga si el guardado fue exitoso.
      await onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los cambios.');
      setBusy(false);
    }
  }

  const adultoVal = f.adultoResponsablePresente == null ? '' : f.adultoResponsablePresente ? 'si' : 'no';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onCerrar} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-borde bg-panel p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-texto-fuerte">Editar familia</h3>
          <button onClick={onCerrar} className="text-texto-suave hover:text-texto-fuerte"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Contacto"><input value={f.nombreContacto} onChange={(e) => set('nombreContacto', e.target.value)} className={inputCls} /></Campo>
            <Campo label="Apellido"><input value={f.apellido} onChange={(e) => set('apellido', e.target.value)} className={inputCls} /></Campo>
            <Campo label="Plaza">
              <select value={f.plaza} onChange={(e) => setF((p) => ({ ...p, plaza: e.target.value as typeof p.plaza }))} className={inputCls}>
                <option value="TOLUCA">Toluca</option>
                <option value="QUERETARO">Querétaro</option>
              </select>
            </Campo>
            <Campo label="Zona / colonia"><input value={f.zona} onChange={(e) => set('zona', e.target.value)} className={inputCls} /></Campo>
            <Campo label="Teléfono"><input value={f.telefono} onChange={(e) => set('telefono', e.target.value)} className={inputCls} /></Campo>
            <Campo label="Emergencia"><input value={f.numeroEmergencia} onChange={(e) => set('numeroEmergencia', e.target.value)} className={inputCls} /></Campo>
            <div className="col-span-2"><Campo label="Correo"><input value={f.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Campo></div>
            <div className="col-span-2"><Campo label="Dirección + referencias"><textarea value={f.direccion} onChange={(e) => set('direccion', e.target.value)} rows={2} className={inputCls} /></Campo></div>
          </div>

          <Campo label="Expectativas del servicio"><textarea value={f.expectativas} onChange={(e) => set('expectativas', e.target.value)} rows={2} className={inputCls} /></Campo>
          <Campo label="Reglas de la casa"><textarea value={f.reglasEspecificas} onChange={(e) => set('reglasEspecificas', e.target.value)} rows={2} className={inputCls} /></Campo>

          <div className="grid grid-cols-2 gap-2">
            <Campo label="Adulto responsable durante el servicio">
              <select value={adultoVal} onChange={(e) => setF((p) => ({ ...p, adultoResponsablePresente: e.target.value === '' ? null : e.target.value === 'si' }))} className={inputCls}>
                <option value="">—</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </Campo>
            <Campo label="Estado">
              <select value={f.estado === 'INACTIVA' ? 'ACTIVA' : f.estado} onChange={(e) => set('estado', e.target.value)} className={inputCls}>
                <option value="ACTIVA">Activa</option>
                <option value="SUSPENDIDA">Suspendida</option>
              </select>
            </Campo>
          </div>
          <p className="-mt-1 text-[11px] text-texto-suave">
            La familia se marca <strong>Inactiva</strong> sola tras 60 días sin servicio; se reactiva al agendarle uno. &quot;Suspendida&quot; es manual (recontratación externa).
          </p>
          <Campo label="Mascotas"><input value={f.mascotas} onChange={(e) => set('mascotas', e.target.value)} className={inputCls} /></Campo>

          <div>
            <p className="mb-1 text-[11px] font-medium text-texto-suave">Áreas a trabajar</p>
            <div className="flex flex-wrap gap-1.5">
              {AREAS_TRABAJO.map((a) => (
                <button key={a} type="button" onClick={() => toggleArea(a)} className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium transition', areas.includes(a) ? 'bg-marca-azul text-white' : 'border border-borde text-texto-suave hover:bg-fondo')}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <Campo label="Autorización audiovisual"><input value={f.autorizacionAudiovisual} onChange={(e) => set('autorizacionAudiovisual', e.target.value)} placeholder="Opción elegida en el formulario" className={inputCls} /></Campo>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-texto-suave">Consentimientos</p>
            <div className="space-y-1.5">
              {CONSENTIMIENTOS.map((c) => (
                <label key={c.clave} className="flex items-center gap-2 text-sm text-texto-fuerte">
                  <input type="checkbox" checked={Boolean(cons[c.clave])} onChange={(e) => setCons((p) => ({ ...p, [c.clave]: e.target.checked }))} className="h-4 w-4" />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-marca-rojo/30 bg-marca-rojo/5 px-3 py-2 text-sm text-marca-rojo">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCerrar} className="rounded-lg border border-borde px-3 py-1.5 text-sm text-texto-suave hover:bg-fondo">Cancelar</button>
          <button onClick={guardar} disabled={busy} className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-texto-suave">{label}</span>
      {children}
    </label>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-texto-suave">{label}</p>
      <p className="truncate font-medium text-texto-fuerte">{valor}</p>
    </div>
  );
}

function CampoTexto({ label, valor }: { label: string; valor: string }) {
  return (
    <p className="text-xs text-texto-suave">
      <strong className="text-texto-fuerte">{label}:</strong> {valor}
    </p>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}

/** Próximas sesiones (ofertadas/aceptadas, de hoy en adelante): las que la
 *  coordinación suele ajustar cuando una mamá pide mover un horario. Permite
 *  cambiar hora y/o fecha en el mismo lugar, sin ir al calendario de cada
 *  nannie; en paquete, el saldo se reequilibra solo (el backend lo recalcula). */
function ProximasSesiones({
  servicios,
  onCambio,
  onPlaneacion,
}: {
  servicios: ServicioHist[];
  onCambio: () => Promise<void>;
  onPlaneacion: (id: string) => void;
}) {
  const hoy = hoyMX();
  const proximas = servicios
    .filter((s) => (s.estado === 'OFERTADO' || s.estado === 'ACEPTADO') && s.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));

  return (
    <div className="rounded-2xl bg-panel p-5 shadow-card">
      <h2 className="text-sm font-semibold text-texto-fuerte">Próximas sesiones</h2>
      <p className="mb-3 text-xs text-texto-suave">
        Ajusta aquí el horario o la fecha de las sesiones por venir, sin ir al calendario de cada nannie.
      </p>
      {proximas.length === 0 ? (
        <p className="text-xs text-texto-suave">No hay sesiones por venir.</p>
      ) : (
        <div className="divide-y divide-borde">
          {proximas.map((s) => {
            // Hermanas: demás sesiones del MISMO paquete aún programadas (de la
            // más lejana a la más cercana), para la opción "compensar".
            const hermanas = s.paqueteId
              ? servicios
                  .filter((x) => x.paqueteId === s.paqueteId && x.id !== s.id && (x.estado === 'OFERTADO' || x.estado === 'ACEPTADO'))
                  .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio))
              : [];
            return <SesionAjustable key={s.id} s={s} hermanas={hermanas} onCambio={onCambio} onPlaneacion={onPlaneacion} />;
          })}
        </div>
      )}
    </div>
  );
}

/** Una sesión próxima con editor inline para cambiar hora (inicio/fin) y/o fecha.
 *  Mapea a los endpoints existentes: `editarHorario` (recalcula duración y saldo
 *  del paquete) y `reprogramarServicio` (mueve de día conservando la duración). */
function SesionAjustable({
  s,
  hermanas,
  onCambio,
  onPlaneacion,
}: {
  s: ServicioHist;
  hermanas: ServicioHist[];
  onCambio: () => Promise<void>;
  onPlaneacion: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [fecha, setFecha] = useState(s.fecha);
  const [ini, setIni] = useState(s.horaInicio);
  const [fin, setFin] = useState(s.horaFin);
  const [compensar, setCompensar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function reiniciar() {
    setFecha(s.fecha);
    setIni(s.horaInicio);
    setFin(s.horaFin);
    setCompensar(false);
    setError('');
  }

  // Horas que se le suman a ESTA sesión (solo si se alarga en el mismo día).
  const finValido = (fin === '00:00' ? 24 * 60 : hhmmMin(fin)) > hhmmMin(ini);
  const fechaCambio = fecha !== s.fecha;
  const delta = finValido ? horasEntreHHmm(ini, fin) - horasEntreHHmm(s.horaInicio, s.horaFin) : 0;
  // La opción "compensar" solo aplica a paquete, al alargar, el mismo día, y si
  // hay otras sesiones del paquete de las que tomar horas.
  const puedeCompensar = s.esPaquete && !fechaCambio && delta > 0 && hermanas.length > 0;

  /** Plan de compensación: toma hasta (duración − 1 h) de cada hermana, de la
   *  más lejana hacia atrás, hasta cubrir `delta`. `falta` > 0 si no alcanzan. */
  function planCompensacion() {
    let restante = delta;
    const plan: { s: ServicioHist; quita: number; nuevaDur: number }[] = [];
    for (const c of hermanas) {
      if (restante <= 0) break;
      const dur = horasEntreHHmm(c.horaInicio, c.horaFin);
      const puede = dur - 1;
      if (puede <= 0) continue;
      const quita = Math.min(puede, restante);
      plan.push({ s: c, quita, nuevaDur: dur - quita });
      restante -= quita;
    }
    return { plan, falta: Math.max(0, restante) };
  }

  async function guardar() {
    const iniCambio = ini !== s.horaInicio;
    const finCambio = fin !== s.horaFin;
    if (!fechaCambio && !iniCambio && !finCambio) {
      setError('No cambiaste nada.');
      return;
    }
    if (!finValido) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    const compensando = compensar && puedeCompensar;
    if (compensando) {
      const { falta } = planCompensacion();
      if (falta > 0) {
        setError(`No alcanzan las horas de las demás sesiones del paquete: faltan ${falta} h.`);
        return;
      }
    }
    setBusy(true);
    setError('');
    try {
      if (compensando) {
        // Alarga esta sesión y resta de las demás del paquete, en una sola
        // operación atómica (el total del paquete no cambia).
        await api.extenderCompensado(s.id, fin, iniCambio ? ini : undefined);
      } else {
        // 1) Si cambia el día: reprograma (conserva la duración; fija la hora de inicio).
        if (fechaCambio) {
          await api.reprogramarServicio(s.id, fecha, ini);
        }
        // 2) Si cambia la hora: editarHorario recalcula duración y el saldo del paquete.
        if (iniCambio || finCambio) {
          await api.editarHorario(s.id, fin, undefined, undefined, ini);
        }
      }
      setEditando(false);
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ajustar la sesión.');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'rounded-lg border border-borde bg-white px-2 py-1 text-xs outline-none focus:border-marca-azul';

  return (
    <div className="py-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-texto-fuerte">
            {fechaCorta(s.fecha)} · {s.horaInicio}–{s.horaFin}
          </p>
          <p className="truncate text-xs text-texto-suave">
            {s.nannie}
            {s.esPaquete && (
              <span className="ml-1 text-marca-morado">
                · Paquete{s.paqueteFolio != null ? ` #${s.paqueteFolio}` : ''}
                {s.paquete ? ` · quedan ${s.paquete.remanentes} h de ${s.paquete.totales} h` : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO_SERVICIO[s.estado].clase)}>
            {ESTADO_SERVICIO[s.estado].label}
          </span>
          {s.requierePlaneacion && !editando && (
            <button
              onClick={() => onPlaneacion(s.id)}
              title="Planeación del servicio"
              className="inline-flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
            >
              <ListChecks className="h-3.5 w-3.5" /> Planeación
            </button>
          )}
          {!editando && (
            <button
              onClick={() => { reiniciar(); setEditando(true); }}
              className="inline-flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
            >
              <Pencil className="h-3.5 w-3.5" /> Ajustar
            </button>
          )}
        </div>
      </div>

      {editando && (
        <div className="mt-2 rounded-xl border border-marca-azul/40 bg-marca-azul/5 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-texto-suave">Fecha</span>
              <input type="date" min={hoyMX()} value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-texto-suave">Inicio</span>
              <HoraSelect value={ini} onChange={setIni} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-texto-suave">Fin</span>
              <HoraSelect value={fin} onChange={setFin} className={inputCls} />
            </label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={guardar}
                disabled={busy}
                className="rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                onClick={() => { setEditando(false); reiniciar(); }}
                className="rounded-lg border border-borde px-3 py-1.5 text-xs text-texto-suave hover:bg-fondo"
              >
                Cancelar
              </button>
            </div>
          </div>
          {puedeCompensar && (
            <div className="mt-2 rounded-lg border border-marca-morado/30 bg-marca-morado/5 p-2">
              <label className="flex items-start gap-2 text-[11px] text-texto-fuerte">
                <input
                  type="checkbox"
                  checked={compensar}
                  onChange={(e) => setCompensar(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span>
                  Compensar: restar {delta} h a las últimas sesiones del paquete (el total del paquete no cambia).
                </span>
              </label>
              {compensar &&
                (() => {
                  const { plan, falta } = planCompensacion();
                  return (
                    <div className="mt-1.5 space-y-0.5 pl-5 text-[11px]">
                      {plan.map((p) => (
                        <p key={p.s.id} className="text-texto-suave">
                          − {p.quita} h a <span className="text-texto-fuerte">{fechaCorta(p.s.fecha)} · {p.s.nannie}</span> (queda {p.nuevaDur} h)
                        </p>
                      ))}
                      {falta > 0 && (
                        <p className="text-marca-rojo">
                          Faltan {falta} h: las demás sesiones no alcanzan (cada una debe quedar en mínimo 1 h).
                        </p>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}
          {s.esPaquete && !compensar && (
            <p className="mt-2 text-[11px] text-texto-suave">
              En paquete, cada sesión toma horas del saldo. Si alargas más de lo que queda, marca &quot;Compensar&quot; para restarlo de otras sesiones; si no, el sistema avisará que hay horas de más por resolver.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-marca-rojo">{error}</p>}
        </div>
      )}
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

/** "HH:mm" → minutos desde medianoche. */
function hhmmMin(h: string): number {
  const [hh, mm] = h.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

/** Horas completas entre dos HH:mm (00:00 como fin = medianoche; cruza medianoche). */
function horasEntreHHmm(ini: string, fin: string): number {
  const finMin = fin === '00:00' ? 24 * 60 : hhmmMin(fin);
  let diff = finMin - hhmmMin(ini);
  if (diff <= 0) diff += 24 * 60;
  return Math.round(diff / 60);
}

/** Tarjeta de servicios de la familia: alterna entre LISTA (agrupada por folio)
 *  y CALENDARIO mensual. Ambas vistas muestran lo mismo (históricos + pendientes). */
function ServiciosFamilia({
  servicios,
  onEncuesta,
  onPlaneacion,
}: {
  servicios: ServicioHist[];
  onEncuesta: (id: string) => void;
  onPlaneacion: (id: string) => void;
}) {
  const [vista, setVista] = useState<'lista' | 'calendario'>('lista');
  const btn = (v: 'lista' | 'calendario', Icon: typeof List, label: string) => (
    <button
      type="button"
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
      className={cn(
        'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition',
        vista === v ? 'bg-panel text-marca-azul shadow-sm' : 'text-texto-suave hover:text-texto-fuerte',
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
  return (
    <div className="rounded-2xl bg-panel p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-texto-fuerte">Historial de servicios</h2>
        {servicios.length > 0 && (
          <div className="flex rounded-lg border border-borde bg-fondo p-0.5">
            {btn('lista', List, 'Lista')}
            {btn('calendario', CalendarDays, 'Calendario')}
          </div>
        )}
      </div>
      {servicios.length === 0 ? (
        <p className="text-xs text-texto-suave">Sin servicios registrados.</p>
      ) : vista === 'lista' ? (
        <HistorialServicios servicios={servicios} onEncuesta={onEncuesta} onPlaneacion={onPlaneacion} />
      ) : (
        <CalendarioServicios servicios={servicios} />
      )}
    </div>
  );
}

/** Vista calendario de los servicios de la familia: rejilla mensual (dom–sáb)
 *  con un chip por servicio (horario + nannie, coloreado por estado). Arranca en
 *  el mes del servicio más reciente; se navega mes a mes. */
function CalendarioServicios({ servicios }: { servicios: ServicioHist[] }) {
  const [mes, setMes] = useState<Date>(() =>
    servicios[0] ? inicioMes(new Date(`${servicios[0].fecha}T00:00:00Z`)) : inicioMes(baseHoyMX()),
  );
  const dias = diasDeMes(mes);
  const porDia = new Map<string, ServicioHist[]>();
  for (const s of servicios) {
    const arr = porDia.get(s.fecha) ?? [];
    arr.push(s);
    porDia.set(s.fecha, arr);
  }
  // Orden dentro del día por hora de inicio.
  for (const arr of porDia.values()) arr.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const blancos = dias[0] ? new Date(`${dias[0].fecha}T00:00:00Z`).getUTCDay() : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setMes(sumarMeses(mes, -1))} className="grid h-7 w-7 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo" aria-label="Mes anterior">
          ‹
        </button>
        <span className="text-sm font-semibold capitalize text-texto-fuerte">{etiquetaMes(mes)}</span>
        <button onClick={() => setMes(sumarMeses(mes, 1))} className="grid h-7 w-7 place-items-center rounded-lg border border-borde text-texto-suave hover:bg-fondo" aria-label="Mes siguiente">
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-texto-suave">
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: blancos }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {dias.map((d) => {
          const servs = porDia.get(d.fecha) ?? [];
          return (
            <div
              key={d.fecha}
              className={cn('min-h-16 rounded-lg border p-1', d.esHoy ? 'border-marca-azul bg-marca-azul/5' : 'border-borde')}
            >
              <span className={cn('text-[10px] font-semibold', d.esHoy ? 'text-marca-azul' : 'text-texto-suave')}>
                {Number(d.fecha.slice(8, 10))}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {servs.map((s) => (
                  <div
                    key={s.id}
                    title={`${etiquetaServicio(s.tipoServicio, s.esPaquete)} · ${s.horaInicio}–${s.horaFin} · ${s.nannie} · ${ESTADO_SERVICIO[s.estado].label}`}
                    className={cn('truncate rounded px-1 py-0.5 text-[9px] leading-tight', ESTADO_SERVICIO[s.estado].clase)}
                  >
                    {s.horaInicio} {s.nannie}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Leyenda de estados presentes en lo que se muestra. */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-texto-suave">
        {[...new Set(servicios.map((s) => s.estado))].map((e) => (
          <span key={e} className="inline-flex items-center gap-1">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-sm', ESTADO_SERVICIO[e].clase)} /> {ESTADO_SERVICIO[e].label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Historial de servicios: los individuales van sueltos y los de paquete se
 *  agrupan (colapsados) por folio; al abrir el grupo se ven sus sesiones. Cada
 *  paquete aparece en la posición de su sesión más reciente (la lista viene
 *  ordenada de la más nueva a la más vieja). */
type ItemHist =
  | { kind: 'ind'; servicios: ServicioHist[] }
  | { kind: 'paq'; paqueteId: string; folio: number | null; servicios: ServicioHist[] };

function HistorialServicios({
  servicios,
  onEncuesta,
  onPlaneacion,
}: {
  servicios: ServicioHist[];
  onEncuesta: (id: string) => void;
  onPlaneacion: (id: string) => void;
}) {
  // Pestañas por año (de la más reciente a la más antigua). El historial viene
  // ordenado de lo más nuevo a lo más viejo.
  const años = [...new Set(servicios.map((s) => s.fecha.slice(0, 4)))].sort().reverse();
  const [año, setAño] = useState(años[0] ?? '');
  const añoActivo = años.includes(año) ? año : años[0] ?? '';
  const delAño = servicios.filter((s) => s.fecha.slice(0, 4) === añoActivo);

  // Dentro del año: un grupo por paquete (colapsable por folio) + UN grupo con
  // todos los individuales ("Servicios individuales"). Cada grupo se ordena por
  // su servicio más reciente (la lista viene de lo más nuevo a lo más viejo).
  const paqMap = new Map<string, ServicioHist[]>();
  const individuales: ServicioHist[] = [];
  for (const s of delAño) {
    if (s.paqueteId) {
      const arr = paqMap.get(s.paqueteId);
      if (arr) arr.push(s);
      else paqMap.set(s.paqueteId, [s]);
    } else {
      individuales.push(s);
    }
  }
  const grupos: ItemHist[] = [];
  for (const [paqueteId, servs] of paqMap) {
    grupos.push({ kind: 'paq', paqueteId, folio: servs[0]?.paqueteFolio ?? null, servicios: servs });
  }
  if (individuales.length) grupos.push({ kind: 'ind', servicios: individuales });
  const refDe = (g: ItemHist) => (g.kind === 'paq' ? g.servicios[0]?.fecha : g.servicios[0]?.fecha) ?? '';
  grupos.sort((a, b) => (refDe(a) < refDe(b) ? 1 : refDe(a) > refDe(b) ? -1 : 0));

  return (
    <div>
      {/* Pestañas de año */}
      <div className="mb-2 flex flex-wrap gap-1">
        {años.map((a) => (
          <button
            key={a}
            onClick={() => setAño(a)}
            className={cn(
              'rounded-lg px-3 py-1 text-xs font-semibold transition',
              a === añoActivo ? 'bg-marca-azul text-white' : 'bg-fondo text-texto-suave hover:bg-borde/40',
            )}
          >
            {a}
            <span className="ml-1 font-normal opacity-70">
              ({servicios.filter((s) => s.fecha.slice(0, 4) === a).length})
            </span>
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <p className="text-xs text-texto-suave">Sin servicios en {añoActivo}.</p>
      ) : (
        <div className="divide-y divide-borde">
          {grupos.map((g) =>
            g.kind === 'paq' ? (
              <PaqueteGrupo key={g.paqueteId} folio={g.folio} servicios={g.servicios} onEncuesta={onEncuesta} onPlaneacion={onPlaneacion} />
            ) : (
              <IndividualesGrupo key="individuales" servicios={g.servicios} onEncuesta={onEncuesta} onPlaneacion={onPlaneacion} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** Cabecera colapsable de un paquete en el historial: folio + nº de sesiones +
 *  rango de fechas; al abrir muestra cada sesión. */
function PaqueteGrupo({
  folio,
  servicios,
  onEncuesta,
  onPlaneacion,
}: {
  folio: number | null;
  servicios: ServicioHist[];
  onEncuesta: (id: string) => void;
  onPlaneacion: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  // La lista viene de más nueva a más vieja: el rango va de la última a la primera.
  const nueva = servicios[0];
  const vieja = servicios[servicios.length - 1];
  const rango =
    servicios.length > 1 ? `${fechaCorta(vieja.fecha)} – ${fechaCorta(nueva.fecha)}` : fechaCorta(nueva.fecha);
  // Saldo del paquete: se toma del servicio más reciente que traiga el dato.
  const conSaldo = servicios.find((s) => s.paquete)?.paquete ?? null;

  return (
    <div className="py-2 text-sm">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-fondo"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-texto-suave transition-transform', abierto && 'rotate-180')} />
          <span className="flex items-center gap-1 rounded-full bg-marca-morado/15 px-2 py-0.5 text-[11px] font-semibold text-marca-morado">
            <Package className="h-3 w-3" /> Paquete{folio != null ? ` #${folio}` : ''}
          </span>
          <span className="truncate text-texto-fuerte">
            {servicios.length} {servicios.length === 1 ? 'sesión' : 'sesiones'}
            <span className="text-texto-suave"> · {rango}</span>
          </span>
        </span>
        {conSaldo && (
          <span className="shrink-0 text-[11px] text-texto-suave">
            quedan {conSaldo.remanentes} h de {conSaldo.totales} h
          </span>
        )}
      </button>
      {abierto && (
        <div className="mt-1 space-y-1 border-l-2 border-marca-morado/20 pl-3">
          {servicios.map((s) => (
            <ServicioRow key={s.id} s={s} onEncuesta={onEncuesta} onPlaneacion={onPlaneacion} dentroDePaquete />
          ))}
        </div>
      )}
    </div>
  );
}

/** Una fila de servicio del historial (dentro del grupo de individuales o de un
 *  paquete ya desplegado). */
function ServicioRow({
  s,
  onEncuesta,
  onPlaneacion,
  dentroDePaquete = false,
}: {
  s: ServicioHist;
  onEncuesta: (id: string) => void;
  onPlaneacion: (id: string) => void;
  dentroDePaquete?: boolean;
}) {
  return (
    <div className="py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-texto-fuerte">{etiquetaServicio(s.tipoServicio, s.esPaquete)} · {fechaCorta(s.fecha)}</p>
          <p className="text-xs text-texto-suave">{s.horaInicio}–{s.horaFin} · {s.nannie}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {s.esPaquete && !dentroDePaquete && (
            <span
              title="Servicio de paquete"
              className="flex items-center gap-1 rounded-full bg-marca-morado/15 px-2 py-0.5 text-[11px] font-semibold text-marca-morado"
            >
              <Package className="h-3 w-3" /> Paquete{s.paqueteFolio != null ? ` #${s.paqueteFolio}` : ''}
            </span>
          )}
          {s.requierePlaneacion && (
            <button
              onClick={() => onPlaneacion(s.id)}
              title="Planeación del servicio"
              className="flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-[11px] font-medium text-marca-azul hover:bg-fondo"
            >
              <ListChecks className="h-3.5 w-3.5" /> Planeación
            </button>
          )}
          {(s.estado === 'ACEPTADO' || s.estado === 'COMPLETADO') && s.portaEncuesta !== false && (
            <button
              onClick={() => onEncuesta(s.id)}
              title="Compartir encuesta con la familia"
              className="flex items-center gap-1 rounded-lg border border-borde px-2 py-1 text-[11px] font-medium text-marca-azul hover:bg-fondo"
            >
              <QrCode className="h-3.5 w-3.5" /> Encuesta
            </button>
          )}
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO_SERVICIO[s.estado].clase)}>
            {ESTADO_SERVICIO[s.estado].label}
          </span>
        </div>
      </div>
      {s.paquete && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-marca-morado">
          <Package className="h-3 w-3 shrink-0" />
          Consumió {s.paquete.consumidas} h del paquete · quedan {s.paquete.remanentes} h de {s.paquete.totales} h
        </p>
      )}
      {s.reporte && (
        <div className="mt-2 rounded-lg bg-fondo px-3 py-2 text-xs">
          <p className="mb-1 font-semibold text-texto-fuerte">Reporte · ánimo del peque: {s.reporte.animoNino}</p>
          <p className="text-texto-suave"><span className="font-medium text-texto-fuerte">Actividades:</span> {s.reporte.actividades}</p>
          {s.reporte.incidentes && (
            <p className="mt-0.5 text-texto-suave"><span className="font-medium text-texto-fuerte">Incidentes:</span> {s.reporte.incidentes}</p>
          )}
          {s.reporte.notas && (
            <p className="mt-0.5 text-texto-suave"><span className="font-medium text-texto-fuerte">Notas:</span> {s.reporte.notas}</p>
          )}
          <p className="mt-1 text-[11px] text-texto-suave">— {s.reporte.autor}</p>
        </div>
      )}
    </div>
  );
}

/** Grupo colapsable de TODOS los servicios individuales de un año (una sola
 *  etiqueta "Servicios Individuales", igual que la de paquete). */
function IndividualesGrupo({
  servicios,
  onEncuesta,
  onPlaneacion,
}: {
  servicios: ServicioHist[];
  onEncuesta: (id: string) => void;
  onPlaneacion: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="py-2 text-sm">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-fondo"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-texto-suave transition-transform', abierto && 'rotate-180')} />
          <span className="flex items-center gap-1 rounded-full bg-marca-azul/10 px-2 py-0.5 text-[11px] font-semibold text-marca-azul">
            <List className="h-3 w-3" /> Servicios individuales
          </span>
          <span className="truncate text-texto-suave">
            {servicios.length} {servicios.length === 1 ? 'servicio' : 'servicios'}
          </span>
        </span>
      </button>
      {abierto && (
        <div className="mt-1 divide-y divide-borde border-l-2 border-marca-azul/20 pl-3">
          {servicios.map((s) => (
            <ServicioRow key={s.id} s={s} onEncuesta={onEncuesta} onPlaneacion={onPlaneacion} />
          ))}
        </div>
      )}
    </div>
  );
}
