'use client';

/**
 * Doble perfil (Jacky): una cuenta de coordinación (Directora/Subdirectora) que
 * ADEMÁS tiene ficha de nannie (nannieId enlazado) puede alternar entre "modo
 * coordinación" y "modo nannie". El modo es SOLO una preferencia de vista en el
 * cliente: NO cambia el rol ni los permisos reales (el backend ya deja pasar el
 * auto-servicio por el nannieId). Hoy solo Jacky califica; la condición es
 * general (coord + nannieId), no un id hardcodeado.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, type Sesion, type Rol } from '@/lib/api';
import { cn } from '@/lib/utils';

export type ModoPerfil = 'coordinacion' | 'nannie';

const CLAVE = 'nannies:modo-perfil';
const COORD: Rol[] = ['DIRECTORA', 'SUBDIRECTORA'];

interface Ctx {
  sesion: Sesion | null;
  /** La sesión puede alternar de perfil (coordinación + ficha de nannie). */
  dual: boolean;
  /** Modo activo (coordinación por defecto). Solo tiene efecto si `dual`. */
  modo: ModoPerfil;
  setModo: (m: ModoPerfil) => void;
  /** Rol con el que se pintan menú y panorama (NANNIE cuando dual + modo nannie). */
  rolEfectivo: Rol | undefined;
  recargar: () => void;
}

const ModoContext = createContext<Ctx | null>(null);

export function ModoProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [modo, setModoState] = useState<ModoPerfil>('coordinacion');

  const recargar = useCallback(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);
  useEffect(() => {
    recargar();
  }, [recargar]);

  // Restaura el modo guardado (solo surte efecto si la sesión es dual).
  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE);
      if (g === 'nannie' || g === 'coordinacion') setModoState(g);
    } catch {
      /* almacenamiento no disponible: se queda en coordinación */
    }
  }, []);

  const dual = !!sesion && sesion.nannieId != null && COORD.includes(sesion.rol);

  const setModo = useCallback((m: ModoPerfil) => {
    setModoState(m);
    try {
      localStorage.setItem(CLAVE, m);
    } catch {
      /* sin persistencia: el modo vive solo en memoria */
    }
  }, []);

  const rolEfectivo: Rol | undefined = !sesion
    ? undefined
    : dual && modo === 'nannie'
      ? 'NANNIE'
      : sesion.rol;

  return (
    <ModoContext.Provider value={{ sesion, dual, modo, setModo, rolEfectivo, recargar }}>
      {children}
    </ModoContext.Provider>
  );
}

export function useModoPerfil(): Ctx {
  const c = useContext(ModoContext);
  if (!c) throw new Error('useModoPerfil se usó fuera de ModoProvider');
  return c;
}

/** Segmented control para alternar de perfil. Se oculta si la sesión no es dual. */
export function SelectorModo({ className }: { className?: string }) {
  const { dual, modo, setModo } = useModoPerfil();
  const router = useRouter();
  if (!dual) return null;

  const cambiar = (m: ModoPerfil) => {
    if (m === modo) return;
    setModo(m);
    router.push('/'); // aterriza en el panorama del modo elegido
  };

  const btn = (m: ModoPerfil, label: string) => (
    <button
      type="button"
      onClick={() => cambiar(m)}
      aria-pressed={modo === m}
      className={cn(
        'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition',
        modo === m ? 'bg-panel text-marca-azul shadow-sm' : 'text-texto-suave hover:text-texto-fuerte',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn('flex rounded-xl border border-borde bg-fondo p-0.5', className)}>
      {btn('coordinacion', 'Coordinación')}
      {btn('nannie', 'Nannie')}
    </div>
  );
}
