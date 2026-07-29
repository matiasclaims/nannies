'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2, Plus, HeartPulse } from 'lucide-react';
import { api, type PerfilFamilia, type NinoPerfil, type NinoInput } from '@/lib/api';
import { TIPO_LABEL, ESTADO_SERVICIO } from '@/lib/dominio';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-lg border border-borde bg-white px-2.5 py-1.5 text-sm outline-none focus:border-marca-azul';

export default function PerfilFamiliaPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PerfilFamilia | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [nuevoNino, setNuevoNino] = useState(false);

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

      {/* Datos de la familia */}
      <div className="rounded-2xl bg-panel p-5 shadow-card">
        <h1 className="text-lg font-semibold text-texto-fuerte">{data.nombreContacto}</h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Dato label="Plaza" valor={data.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'} />
          <Dato label="Zona" valor={data.zona ?? '—'} />
          <Dato label="Teléfono" valor={data.telefono ?? '—'} />
          <Dato label="Correo" valor={data.email ?? '—'} />
        </div>
        {data.paqueteActivo && (
          <p className="mt-3 text-xs text-texto-suave">
            Paquete activo: <strong className="text-texto-fuerte">{data.paqueteActivo.horasRestantes}/{data.paqueteActivo.horasTotales} h</strong>
          </p>
        )}
      </div>

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
      <textarea placeholder="Necesidades / carácter / temas de interés" value={f.necesidades} onChange={(e) => setF({ ...f, necesidades: e.target.value })} rows={2} className={inputCls} />
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
