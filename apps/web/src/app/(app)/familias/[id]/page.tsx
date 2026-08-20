'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2, Plus, HeartPulse, X, Check } from 'lucide-react';
import { api, type PerfilFamilia, type NinoPerfil, type NinoInput, type FamiliaInput } from '@/lib/api';
import { TIPO_LABEL, ESTADO_SERVICIO } from '@/lib/dominio';
import { AREAS_TRABAJO, CONSENTIMIENTOS } from '@/lib/familia-catalogo';
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
          <p className="mt-3"><CampoTexto label="Autorización audiovisual" valor={data.autorizacionAudiovisual} /></p>
        )}

        <div className="mt-3 border-t border-borde pt-3">
          <p className="mb-1.5 text-[11px] text-texto-suave">Consentimientos</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {CONSENTIMIENTOS.map((c) => (
              <ConsentBadge key={c.clave} label={c.label} on={Boolean(data[c.clave])} />
            ))}
          </div>
        </div>

        {data.paqueteActivo && (
          <p className="mt-3 text-xs text-texto-suave">
            Paquete activo: <strong className="text-texto-fuerte">{data.paqueteActivo.horasRestantes}/{data.paqueteActivo.horasTotales} h</strong>
          </p>
        )}
      </div>

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

      {/* Historial de servicios */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <h2 className="mb-2 text-sm font-semibold text-texto-fuerte">Historial de servicios</h2>
        {data.servicios.length === 0 ? (
          <p className="text-xs text-texto-suave">Sin servicios registrados.</p>
        ) : (
          <div className="divide-y divide-borde">
            {data.servicios.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-texto-fuerte">{TIPO_LABEL[s.tipoServicio]} · {fechaCorta(s.fecha)}</p>
                  <p className="text-xs text-texto-suave">{s.horaInicio}–{s.horaFin} · {s.nannie}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', ESTADO_SERVICIO[s.estado].clase)}>
                  {ESTADO_SERVICIO[s.estado].label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bitácora */}
      <Bitacora familiaId={id} notas={data.notas} onCambio={cargar} />
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
              {nino.edad != null && <span className="text-texto-suave"> · {nino.edad} años</span>}
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
        <input type="number" min={0} max={18} placeholder="Edad" value={f.edad ?? ''} onChange={(e) => setF({ ...f, edad: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
        <input placeholder="Género" value={f.genero} onChange={(e) => setF({ ...f, genero: e.target.value })} className={cn(inputCls, 'sm:col-span-3')} />
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

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }) as typeof p);
  const toggleArea = (a: string) => setAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  async function guardar() {
    setBusy(true);
    const t = (s: string) => s.trim() || undefined;
    await api
      .editarFamilia(familia.id, {
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
      })
      .catch(() => undefined);
    setBusy(false);
    await onGuardado();
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

function fechaCorta(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
