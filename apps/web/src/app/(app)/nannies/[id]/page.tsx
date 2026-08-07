'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserMinus, Check, Camera, Pencil } from 'lucide-react';
import { api, ApiError, type NanniePerfil } from '@/lib/api';
import { ZONAS_QRO } from '@/lib/queretaro';
import { CATALOGO_DOCUMENTOS, CATALOGO_CURSOS, type ItemChecklist } from '@/lib/nannie-catalogos';
import { COLORES_NANNIE, ESTADO_NANNIE, RANGO_LABEL, NIVEL_LABEL, UMBRALES_RANGO } from '@/lib/nannie-ui';
import { IncidenciasNannie } from '@/components/incidencias-nannie';
import { BitacoraNannie } from '@/components/bitacora-nannie';
import { Avatar } from '@/components/avatar';
import { FotoModal } from '@/components/foto-modal';
import { cn } from '@/lib/utils';

export default function NanniePerfilPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [perfil, setPerfil] = useState<NanniePerfil | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [esDirectora, setEsDirectora] = useState(false);
  const [editandoFoto, setEditandoFoto] = useState(false);

  useEffect(() => {
    api.me().then((s) => setEsDirectora(s.rol === 'DIRECTORA')).catch(() => undefined);
  }, []);

  const cargar = useCallback(() => {
    setEstado('cargando');
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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/nannies" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-texto-fuerte">
        <ArrowLeft className="h-4 w-4" /> Nannies
      </Link>

      <div className="flex items-start gap-3 rounded-2xl bg-panel p-4 shadow-card">
        <button
          type="button"
          onClick={() => setEditandoFoto(true)}
          className="group relative shrink-0"
          title="Cambiar foto"
        >
          <Avatar foto={perfil.foto} nombre={perfil.nombre} color={perfil.color} size={48} />
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-panel text-texto-suave shadow-card">
            <Camera className="h-3 w-3" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-texto-fuerte">{perfil.nombre}</p>
          <p className="truncate text-xs text-texto-suave">
            {perfil.correo ?? 'sin cuenta'} · {perfil.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca'}
          </p>
          <EspecialidadHeader perfil={perfil} onGuardado={cargar} />
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', ESTADO_NANNIE[perfil.estado].clase)}>
          {ESTADO_NANNIE[perfil.estado].label}
        </span>
      </div>

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
        <p className="text-center text-[11px] text-texto-suave">
          El rango sube solo en el cierre de mes por servicios de por vida:{' '}
          {UMBRALES_RANGO.map((u) => `${RANGO_LABEL[u.rango]} ${u.servicios}`).join(' · ')}. El nivel del mes lo
          fija el mismo cierre según las horas.
        </p>
      )}

      <Editor perfil={perfil} onGuardado={cargar} onBaja={() => router.push('/nannies')} />

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
    </div>
  );
}

/** Especialidad/experiencia editable dentro de la tarjeta del encabezado. */
function EspecialidadHeader({ perfil, onGuardado }: { perfil: NanniePerfil; onGuardado: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(perfil.especialidad ?? '');
  const [busy, setBusy] = useState(false);

  async function guardar() {
    setBusy(true);
    await api.editarNannie(perfil.id, { especialidad: valor }).catch(() => undefined);
    setBusy(false);
    setEditando(false);
    onGuardado();
  }

  if (editando) {
    return (
      <div className="mt-1.5">
        <textarea
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          rows={2}
          autoFocus
          className="w-full resize-none rounded-lg border border-borde bg-white px-2 py-1 text-xs outline-none focus:border-marca-azul"
          placeholder="Especialidad y experiencia (ej. recién nacidos, necesidades especiales, fiestas)"
        />
        <div className="mt-1 flex gap-2">
          <button
            onClick={guardar}
            disabled={busy}
            className="rounded-lg bg-marca-azul px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={() => {
              setValor(perfil.especialidad ?? '');
              setEditando(false);
            }}
            className="rounded-lg border border-borde px-2.5 py-1 text-[11px] text-texto-suave"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValor(perfil.especialidad ?? '');
        setEditando(true);
      }}
      className="mt-1 flex items-start gap-1 text-left"
      title="Editar especialidad y experiencia"
    >
      {perfil.especialidad ? (
        <span className="line-clamp-2 text-xs text-texto-fuerte">{perfil.especialidad}</span>
      ) : (
        <span className="text-xs italic text-texto-suave">Agregar especialidad y experiencia</span>
      )}
      <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-texto-suave" />
    </button>
  );
}

function Editor({ perfil, onGuardado, onBaja }: { perfil: NanniePerfil; onGuardado: () => void; onBaja: () => void }) {
  const esQro = perfil.plaza === 'QUERETARO';
  const [estado, setEstadoV] = useState(perfil.estado);
  const [docsEntregados, setDocsEntregados] = useState<string[]>(perfil.documentosEntregados);
  const [cursos, setCursos] = useState<string[]>(perfil.cursosCompletados);
  const [color, setColor] = useState(perfil.color ?? COLORES_NANNIE[0]);
  const [telefono, setTelefono] = useState(perfil.telefono ?? '');
  const [zonas, setZonas] = useState<string[]>(perfil.zonas);
  const [zonasTexto, setZonasTexto] = useState(perfil.zonas.join(', '));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function guardar() {
    setBusy(true);
    setMsg('');
    const zonasFinal = esQro ? zonas : zonasTexto.split(',').map((z) => z.trim()).filter(Boolean);
    try {
      await api.editarNannie(perfil.id, {
        estado: estado === 'BAJA' ? undefined : estado,
        documentosEntregados: docsEntregados,
        cursosCompletados: cursos,
        color,
        telefono,
        zonas: zonasFinal,
      });
      setMsg('Guardado.');
      onGuardado();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  async function darDeBaja() {
    if (!confirm(`¿Dar de baja a ${perfil.nombre}? Se desactiva su cuenta pero se conserva su historial.`)) return;
    setBusy(true);
    await api.darDeBajaNannie(perfil.id).catch(() => undefined);
    setBusy(false);
    onBaja();
  }

  const input = 'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

  return (
    <div className="space-y-4 rounded-2xl bg-panel p-4 shadow-card">
      <h2 className="text-sm font-semibold text-texto-fuerte">Expediente</h2>

      <div className="grid gap-3 sm:grid-cols-2">
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
          <span className="mb-1 block text-xs font-medium text-texto-suave">Teléfono</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={input} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Checklist
          titulo="Documentación"
          items={CATALOGO_DOCUMENTOS}
          marcadas={docsEntregados}
          onToggle={(k) => setDocsEntregados((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
        />
        <Checklist
          titulo="Capacitación (cursos)"
          items={CATALOGO_CURSOS}
          marcadas={cursos}
          onToggle={(k) => setCursos((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
        />
      </div>

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

      {msg && <p className="text-xs text-texto-suave">{msg}</p>}

      <div className="flex items-center justify-between gap-2 border-t border-borde pt-3">
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
          disabled={busy}
          className="rounded-lg bg-marca-azul px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-panel p-3 shadow-card">
      <p className="text-[11px] text-texto-suave">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-texto-fuerte">{valor}</p>
    </div>
  );
}

function Checklist({
  titulo,
  items,
  marcadas,
  onToggle,
}: {
  titulo: string;
  items: ItemChecklist[];
  marcadas: string[];
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
          return (
            <button key={it.clave} type="button" onClick={() => onToggle(it.clave)} className="flex w-full items-start gap-2 text-left">
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
                {it.fuente && <span className="block text-[10px] text-texto-suave">{it.fuente}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
