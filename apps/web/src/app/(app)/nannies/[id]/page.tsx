'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserMinus, Check, Camera, Pencil, Award, ClipboardCheck, X, ExternalLink } from 'lucide-react';
import { api, ApiError, type NanniePerfil, type Plaza, type DocumentoNannie } from '@/lib/api';
import { ZONAS_QRO } from '@/lib/queretaro';
import { CATALOGO_DOCUMENTOS, CATALOGO_CURSOS, type ItemChecklist } from '@/lib/nannie-catalogos';
import { COLORES_NANNIE, ESTADO_NANNIE, RANGO_LABEL, NIVEL_LABEL, UMBRALES_RANGO } from '@/lib/nannie-ui';
import { IncidenciasNannie } from '@/components/incidencias-nannie';
import { EvaluacionNannie } from '@/components/evaluacion-nannie';
import { BitacoraNannie } from '@/components/bitacora-nannie';
import { Avatar } from '@/components/avatar';
import { NombreNannie } from '@/components/nombre-nannie';
import { FotoModal } from '@/components/foto-modal';
import { Seccion } from '@/components/seccion';
import { cn } from '@/lib/utils';

const input = 'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

export default function NanniePerfilPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [perfil, setPerfil] = useState<NanniePerfil | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [esDirectora, setEsDirectora] = useState(false);
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(false);

  useEffect(() => {
    api.me().then((s) => setEsDirectora(s.rol === 'DIRECTORA')).catch(() => undefined);
  }, []);

  const cargar = useCallback(() => {
    api
      .perfilNannie(id)
      .then((p) => {
        setPerfil(p);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, [id]);

  useEffect(cargar, [cargar]);

  if (estado === 'cargando') return <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-2xl bg-panel" />;
  if (estado === 'error' || !perfil)
    return <p className="mx-auto max-w-2xl text-sm text-texto-suave">No se pudo cargar el expediente.</p>;

  const ciudad = perfil.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/nannies" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-texto-fuerte">
        <ArrowLeft className="h-4 w-4" /> Nannies
      </Link>

      {/* Tarjeta: identidad + botón para editar todo el perfil */}
      <div className="flex items-start gap-3 rounded-2xl bg-panel p-4 shadow-card">
        <button type="button" onClick={() => setEditandoFoto(true)} className="relative shrink-0" title="Cambiar foto">
          <Avatar foto={perfil.foto} nombre={perfil.nombre} color={perfil.color} size={48} />
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-panel text-texto-suave shadow-card">
            <Camera className="h-3 w-3" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-texto-fuerte">
            <NombreNannie nombre={perfil.nombre} color={perfil.color} />
          </p>
          <p className="truncate text-xs text-texto-suave">
            {perfil.correo ?? 'sin cuenta'} · {ciudad}
          </p>
          {perfil.especialidad ? (
            <p className="mt-1 line-clamp-2 text-xs text-texto-fuerte">{perfil.especialidad}</p>
          ) : (
            <p className="mt-1 text-xs italic text-texto-suave">Sin especialidad — agrégala en Editar</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ESTADO_NANNIE[perfil.estado].clase)}>
            {ESTADO_NANNIE[perfil.estado].label}
          </span>
          <button
            onClick={() => setEditandoPerfil(true)}
            className="flex items-center gap-1 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-marca-azul hover:bg-fondo"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        </div>
      </div>

      {/* Desempeño */}
      <Seccion icon={Award} title="Desempeño" tint="azul" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-3">
          <Dato label="Servicios de por vida" valor={String(perfil.serviciosAcumulados)} />
          <Dato
            label="Rango (automático)"
            valor={perfil.plaza === 'QUERETARO' ? 'N/A (por zona)' : RANGO_LABEL[perfil.rango] ?? perfil.rango}
          />
          <Dato
            label="Nivel del mes"
            valor={perfil.plaza === 'QUERETARO' ? 'N/A (por zona)' : NIVEL_LABEL[perfil.nivelActual] ?? perfil.nivelActual}
          />
        </div>
        {perfil.plaza !== 'QUERETARO' && (
          <p className="mt-3 text-center text-[11px] text-texto-suave">
            El rango sube solo en el cierre de mes por servicios de por vida:{' '}
            {UMBRALES_RANGO.map((u) => `${RANGO_LABEL[u.rango]} ${u.servicios}`).join(' · ')}. El nivel del mes lo
            fija el mismo cierre según las horas.
          </p>
        )}
      </Seccion>

      {/* Expediente: solo documentación y capacitación */}
      <Seccion icon={ClipboardCheck} title="Expediente" subtitle="Documentación y capacitación" tint="verde" defaultOpen={false}>
        <ExpedienteChecklists perfil={perfil} onGuardado={cargar} />
      </Seccion>

      <EvaluacionNannie nannieId={perfil.id} />

      <IncidenciasNannie nannieId={perfil.id} nombre={perfil.nombre} esDirectora={esDirectora} />

      <BitacoraNannie nannieId={perfil.id} />

      {editandoFoto && (
        <FotoModal
          nombre={perfil.nombre}
          fotoActual={perfil.foto}
          titulo={`Foto de ${perfil.nombre}`}
          onGuardar={async (foto) => {
            await api.fotoNannie(perfil.id, foto);
            cargar();
          }}
          onClose={() => setEditandoFoto(false)}
        />
      )}

      {editandoPerfil && (
        <EditarPerfilModal
          perfil={perfil}
          refrescar={cargar}
          onClose={() => setEditandoPerfil(false)}
          onGuardado={() => {
            setEditandoPerfil(false);
            cargar();
          }}
          onBaja={() => router.push('/nannies')}
        />
      )}
    </div>
  );
}

/** Edición de TODO el perfil (identidad): nombre, foto, estado, ciudad,
 *  teléfono, zonas, color y especialidad. También la baja. */
function EditarPerfilModal({
  perfil,
  refrescar,
  onClose,
  onGuardado,
  onBaja,
}: {
  perfil: NanniePerfil;
  refrescar: () => void;
  onClose: () => void;
  onGuardado: () => void;
  onBaja: () => void;
}) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [plaza, setPlaza] = useState<Plaza>(perfil.plaza);
  const [estado, setEstadoV] = useState(perfil.estado);
  const [telefono, setTelefono] = useState(perfil.telefono ?? '');
  const [zonas, setZonas] = useState<string[]>(perfil.zonas);
  const [zonasTexto, setZonasTexto] = useState(perfil.zonas.join(', '));
  const [color, setColor] = useState(perfil.color ?? COLORES_NANNIE[0]);
  const [especialidad, setEspecialidad] = useState(perfil.especialidad ?? '');
  const [fotoActual, setFotoActual] = useState(perfil.foto);
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const esQro = plaza === 'QUERETARO';

  async function guardar() {
    setBusy(true);
    setError('');
    const zonasFinal = esQro ? zonas : zonasTexto.split(',').map((z) => z.trim()).filter(Boolean);
    try {
      await api.editarNannie(perfil.id, {
        nombre: nombre.trim(),
        plaza,
        estado: estado === 'BAJA' ? undefined : estado,
        telefono,
        zonas: zonasFinal,
        color,
        especialidad,
      });
      onGuardado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.');
      setBusy(false);
    }
  }

  async function darDeBaja() {
    if (!confirm(`¿Dar de baja a ${perfil.nombre}? Se desactiva su cuenta pero se conserva su historial.`)) return;
    setBusy(true);
    await api.darDeBajaNannie(perfil.id).catch(() => undefined);
    onBaja();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-borde p-4">
          <h2 className="text-sm font-semibold text-texto-fuerte">Editar perfil</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-texto-suave hover:bg-fondo">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          <div className="flex items-center gap-3">
            <Avatar foto={fotoActual} nombre={nombre} color={color} size={56} />
            <button
              onClick={() => setEditandoFoto(true)}
              className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-marca-azul hover:bg-fondo"
            >
              <Camera className="h-3.5 w-3.5" /> Cambiar foto
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-texto-suave">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Estado</span>
              <select value={estado} onChange={(e) => setEstadoV(e.target.value as typeof estado)} className={input}>
                <option value="PRUEBA">Prueba</option>
                <option value="ACTIVA">Activa</option>
                <option value="PAUSA">Pausa</option>
                {estado === 'BAJA' && <option value="BAJA">Baja</option>}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-suave">Ciudad</span>
              <select value={plaza} onChange={(e) => setPlaza(e.target.value as Plaza)} className={input}>
                <option value="TOLUCA">Toluca</option>
                <option value="QUERETARO">Querétaro</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-texto-suave">Teléfono</span>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={input} />
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-texto-suave">Zonas que cubre</span>
            {esQro ? (
              <div className="flex flex-wrap gap-1.5">
                {ZONAS_QRO.map((z) => {
                  const on = zonas.includes(z);
                  return (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZonas((p) => (on ? p.filter((x) => x !== z) : [...p, z]))}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs',
                        on ? 'border-marca-azul bg-marca-azul/10 text-marca-azul' : 'border-borde text-texto-suave',
                      )}
                    >
                      {z}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input value={zonasTexto} onChange={(e) => setZonasTexto(e.target.value)} className={input} placeholder="Metepec, Toluca Centro" />
            )}
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-texto-suave">Color</span>
            <div className="flex flex-wrap gap-2">
              {COLORES_NANNIE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn('h-7 w-7 rounded-full ring-offset-2 transition', color === c && 'ring-2 ring-texto-fuerte')}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-texto-suave">Especialidad y experiencia</span>
            <textarea
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              rows={3}
              className={cn(input, 'resize-none')}
              placeholder="Ej. Lic. en Psicología. Experiencia con recién nacidos y necesidades especiales."
            />
          </label>

          {error && <p className="text-sm text-marca-rojo">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-borde p-4">
          <button
            onClick={darDeBaja}
            disabled={busy || perfil.estado === 'BAJA'}
            className="flex items-center gap-1.5 rounded-lg border border-[#5B292D]/40 px-3 py-1.5 text-sm text-[#5B292D] hover:bg-[#5B292D]/5 disabled:opacity-40"
          >
            <UserMinus className="h-4 w-4" />
            {perfil.estado === 'BAJA' ? 'Dada de baja' : 'Dar de baja'}
          </button>
          <button
            onClick={guardar}
            disabled={busy || !nombre.trim()}
            className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {editandoFoto && (
        <FotoModal
          nombre={nombre}
          fotoActual={fotoActual}
          titulo={`Foto de ${nombre}`}
          onGuardar={async (foto) => {
            await api.fotoNannie(perfil.id, foto);
            setFotoActual(foto);
            refrescar();
          }}
          onClose={() => setEditandoFoto(false)}
        />
      )}
    </div>
  );
}

/** Solo los checklists de documentación y capacitación (van en el Expediente). */
function ExpedienteChecklists({ perfil, onGuardado }: { perfil: NanniePerfil; onGuardado: () => void }) {
  const [docsEntregados, setDocsEntregados] = useState<string[]>(perfil.documentosEntregados);
  const [cursos, setCursos] = useState<string[]>(perfil.cursosCompletados);
  const [subidos, setSubidos] = useState<DocumentoNannie[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.documentosDeNannie(perfil.id).then(setSubidos).catch(() => setSubidos([]));
  }, [perfil.id]);
  const archivos = new Map(subidos.map((d) => [d.clave, d]));

  async function guardar() {
    setBusy(true);
    setMsg('');
    try {
      await api.editarNannie(perfil.id, { documentosEntregados: docsEntregados, cursosCompletados: cursos });
      setMsg('Guardado.');
      onGuardado();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Checklist
          titulo="Documentación"
          items={CATALOGO_DOCUMENTOS}
          marcadas={docsEntregados}
          archivos={archivos}
          onToggle={(k) => setDocsEntregados((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
        />
        <Checklist
          titulo="Capacitación (cursos)"
          items={CATALOGO_CURSOS}
          marcadas={cursos}
          archivos={archivos}
          onToggle={(k) => setCursos((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {msg && <span className="text-xs text-texto-suave">{msg}</span>}
        <button
          onClick={guardar}
          disabled={busy}
          className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-fondo p-3">
      <p className="text-[11px] text-texto-suave">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-texto-fuerte">{valor}</p>
    </div>
  );
}

function Checklist({
  titulo,
  items,
  marcadas,
  archivos,
  onToggle,
}: {
  titulo: string;
  items: ItemChecklist[];
  marcadas: string[];
  archivos: Map<string, DocumentoNannie>;
  onToggle: (clave: string) => void;
}) {
  const hechas = items.filter((i) => marcadas.includes(i.clave)).length;
  const completo = hechas === items.length;
  return (
    <div className="rounded-xl border border-borde p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-texto-fuerte">{titulo}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            completo ? 'bg-marca-verde/25 text-[#5c7a2e]' : 'bg-amber-50 text-amber-700',
          )}
        >
          {hechas}/{items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => {
          const on = marcadas.includes(it.clave);
          const archivo = archivos.get(it.clave);
          return (
            <div key={it.clave} className="flex items-start gap-2">
              <button type="button" onClick={() => onToggle(it.clave)} className="flex min-w-0 flex-1 items-start gap-2 text-left">
                <span
                  className={cn(
                    'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition',
                    on ? 'border-marca-verde bg-marca-verde text-white' : 'border-borde',
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-texto-fuerte">{it.nombre}</span>
                  {archivo ? (
                    <span className="block truncate text-[10px] text-marca-azul">{archivo.nombreArchivo}</span>
                  ) : (
                    it.fuente && <span className="block text-[10px] text-texto-suave">{it.fuente}</span>
                  )}
                </span>
              </button>
              {archivo?.url && (
                <a
                  href={archivo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-texto-suave hover:text-marca-azul"
                  title="Ver archivo"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
