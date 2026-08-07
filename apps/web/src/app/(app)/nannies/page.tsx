'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Mail, KeyRound, X, MapPin } from 'lucide-react';
import { api, ApiError, type NannieExpediente, type Plaza, type AltaNannieResultado } from '@/lib/api';
import { ZONAS_QRO } from '@/lib/queretaro';
import { COLORES_NANNIE, ESTADO_NANNIE as ESTADO } from '@/lib/nannie-ui';
import { Avatar } from '@/components/avatar';
import { NombreNannie } from '@/components/nombre-nannie';
import { cn } from '@/lib/utils';

const CIUDADES: { id: Plaza; label: string }[] = [
  { id: 'TOLUCA', label: 'Toluca' },
  { id: 'QUERETARO', label: 'Querétaro' },
];

export default function NanniesPage() {
  const [lista, setLista] = useState<NannieExpediente[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'prohibido' | 'error'>('cargando');
  const [ciudad, setCiudad] = useState<Plaza>('TOLUCA');
  const [alta, setAlta] = useState(false);

  const filtradas = lista?.filter((n) => n.plaza === ciudad) ?? [];
  const ciudadLabel = CIUDADES.find((c) => c.id === ciudad)?.label ?? '';

  const cargar = () => {
    setEstado('cargando');
    api
      .listarExpedientes()
      .then((l) => {
        setLista(l);
        setEstado('ok');
      })
      .catch((e) => setEstado(e instanceof ApiError && e.status === 403 ? 'prohibido' : 'error'));
  };

  useEffect(cargar, []);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-texto-fuerte">Nannies</h1>
          <p className="text-sm text-texto-suave">Expedientes del equipo.</p>
        </div>
        <button
          onClick={() => setAlta(true)}
          className="flex items-center gap-2 rounded-xl bg-marca-azul px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <UserPlus className="h-4 w-4" />
          Agregar nannie
        </button>
      </div>

      {estado === 'prohibido' ? (
        <Aviso texto="Esta sección es solo para coordinación (Directora y Subdirectora)." />
      ) : estado === 'error' ? (
        <Aviso texto="No se pudo cargar. ¿Está arriba la API?" />
      ) : estado === 'cargando' ? (
        <div className="h-40 animate-pulse rounded-2xl bg-panel" />
      ) : lista && lista.length === 0 ? (
        <Aviso texto="Aún no hay nannies. Agrega la primera con el botón de arriba." />
      ) : (
        <>
          {/* Pestañas por ciudad */}
          <div className="flex gap-2">
            {CIUDADES.map((c) => {
              const cuenta = lista?.filter((n) => n.plaza === c.id).length ?? 0;
              const activa = ciudad === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCiudad(c.id)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition',
                    activa
                      ? 'border-marca-azul bg-marca-azul/10 text-marca-azul'
                      : 'border-borde bg-panel text-texto-suave hover:bg-fondo',
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  {c.label}
                  <span
                    className={cn(
                      'grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                      activa ? 'bg-marca-azul text-white' : 'bg-fondo text-texto-suave',
                    )}
                  >
                    {cuenta}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Nannies de la ciudad seleccionada */}
          {filtradas.length === 0 ? (
            <Aviso texto={`Aún no hay nannies en ${ciudadLabel}.`} />
          ) : (
            <div className="space-y-2">
              {filtradas.map((n) => (
                <Link
                  key={n.id}
                  href={`/nannies/${n.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-panel p-3 shadow-card transition hover:brightness-[0.98]"
                >
              <Avatar foto={n.foto} nombre={n.nombre} color={n.color} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-texto-fuerte">
                  <NombreNannie nombre={n.nombre} color={n.color} />
                </p>
                <p className="truncate text-xs text-texto-suave">
                  {n.plaza === 'QUERETARO' ? 'Querétaro' : 'Toluca'}
                  {n.zonas.length > 0 && ` · ${n.zonas.join(', ')}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(!n.documentacionCompleta || !n.capacitacionCompleta) && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    {!n.documentacionCompleta ? 'Sin docs' : 'Sin capacitación'}
                  </span>
                )}
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ESTADO[n.estado].clase)}>
                  {ESTADO[n.estado].label}
                </span>
              </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {alta && (
        <AltaNannie
          onClose={() => setAlta(false)}
          onCreada={() => {
            cargar();
          }}
        />
      )}
    </div>
  );
}

function AltaNannie({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [plaza, setPlaza] = useState<Plaza>('TOLUCA');
  const [zonasTexto, setZonasTexto] = useState('');
  const [zonasQro, setZonasQro] = useState<string[]>([]);
  const [color, setColor] = useState(COLORES_NANNIE[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<AltaNannieResultado | null>(null);

  const esQro = plaza === 'QUERETARO';
  const zonas = esQro ? zonasQro : zonasTexto.split(',').map((z) => z.trim()).filter(Boolean);
  const invalida = !nombre.trim() || !/.+@.+\..+/.test(correo) || zonas.length === 0;

  const input =
    'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul';

  async function crear() {
    if (invalida) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.crearNannie({
        nombre: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim() || undefined,
        plaza,
        zonas,
        color,
      });
      setResultado(r);
      onCreada();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la nannie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 bg-texto-fuerte/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-panel p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-fuerte">Agregar nannie</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-texto-suave hover:bg-fondo">
            <X className="h-4 w-4" />
          </button>
        </div>

        {resultado ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-marca-verde/15 p-4 text-sm text-[#3b6d11]">
              <p className="font-semibold">Nannie creada en estado Prueba.</p>
            </div>
            {resultado.correoEnviado ? (
              <p className="flex items-start gap-2 text-sm text-texto-suave">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-marca-azul" />
                Se envió un correo a <strong className="text-texto-fuerte">{resultado.correo}</strong> con su
                contraseña temporal. La cambiará en su primer ingreso.
              </p>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="flex items-center gap-1.5 font-medium">
                  <KeyRound className="h-4 w-4" />
                  El correo no se envió (falta configurar el envío).
                </p>
                <p className="mt-1">
                  Pásale esta contraseña temporal a la nannie:
                </p>
                <p className="mt-1 rounded-lg bg-white px-3 py-2 text-center font-mono text-base font-bold text-texto-fuerte">
                  {resultado.passwordTemporal}
                </p>
              </div>
            )}
            <button onClick={onClose} className="w-full rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white">
              Listo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Campo label="Nombre">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
            </Campo>
            <Campo label="Correo (su acceso)">
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className={input} placeholder="nombre@correo.mx" />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Teléfono">
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={input} placeholder="opcional" />
              </Campo>
              <Campo label="Plaza">
                <select value={plaza} onChange={(e) => setPlaza(e.target.value as Plaza)} className={input}>
                  <option value="TOLUCA">Toluca</option>
                  <option value="QUERETARO">Querétaro</option>
                </select>
              </Campo>
            </div>

            <Campo label="Zonas que cubre">
              {esQro ? (
                <div className="flex flex-wrap gap-1.5">
                  {ZONAS_QRO.map((z) => {
                    const on = zonasQro.includes(z);
                    return (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZonasQro((prev) => (on ? prev.filter((x) => x !== z) : [...prev, z]))}
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
                <input value={zonasTexto} onChange={(e) => setZonasTexto(e.target.value)} className={input} placeholder="Metepec, Toluca Centro (separadas por coma)" />
              )}
            </Campo>

            <Campo label="Color">
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
            </Campo>

            {error && <p className="text-sm text-marca-rojo">{error}</p>}

            <button
              onClick={crear}
              disabled={busy || invalida}
              className="w-full rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Creando…' : 'Crear nannie'}
            </button>
            <p className="text-center text-[11px] text-texto-suave">
              Se crea en estado Prueba con una contraseña temporal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-texto-suave">{label}</span>
      {children}
    </label>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde bg-panel p-6 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}
