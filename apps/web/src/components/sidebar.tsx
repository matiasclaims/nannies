'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Camera } from 'lucide-react';
import { navPara } from '@/lib/nav';
import { api, type Sesion } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/avatar';
import { FotoModal } from '@/components/foto-modal';

const ROL_LABEL: Record<Sesion['rol'], string> = {
  DIRECTORA: 'Directora',
  SUBDIRECTORA: 'Subdirectora',
  NANNIE: 'Nannie',
};

/** Sidebar de escritorio (piel "Claro"): marca arriba, perfil abajo. */
export function Sidebar() {
  const pathname = usePathname();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [editandoFoto, setEditandoFoto] = useState(false);

  useEffect(() => {
    api.me().then(setSesion).catch(() => undefined);
  }, []);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-borde bg-panel px-3 py-5 md:flex">
      <div className="mb-6 px-2">
        <Logo className="h-12 w-auto" />
      </div>

      <nav className="flex flex-col gap-1">
        {navPara(sesion?.rol).map((item) => {
          const activo = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                activo
                  ? 'bg-marca-azul/10 font-semibold text-marca-azul'
                  : 'text-texto-suave hover:bg-fondo hover:text-texto-fuerte',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* PROVISIONAL: seguimiento de avance para Paula (se retira al entregar).
          Solo coordinación; la nannie no lo ve. */}
      {sesion?.rol !== 'NANNIE' && (
        <Link
          href="/avance"
          className={cn(
            'mt-2 flex items-center gap-3 rounded-xl border border-dashed border-marca-morado/40 px-3 py-2 text-sm transition',
            pathname.startsWith('/avance')
              ? 'bg-marca-morado/10 font-semibold text-marca-morado'
              : 'text-texto-suave hover:bg-fondo hover:text-marca-morado',
          )}
        >
          <TrendingUp className="h-[18px] w-[18px]" />
          Avance del proyecto
        </Link>
      )}

      {/* Perfil actual (abajo-izquierda): clic para cambiar la foto */}
      <div className="mt-auto border-t border-borde pt-3">
        <button
          type="button"
          disabled={!sesion}
          onClick={() => setEditandoFoto(true)}
          className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-fondo disabled:cursor-default"
        >
          <span className="relative">
            <Avatar foto={sesion?.foto} nombre={sesion?.nombre ?? '··'} size={36} />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-panel text-texto-suave opacity-0 shadow-card transition group-hover:opacity-100">
              <Camera className="h-2.5 w-2.5" />
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-texto-fuerte">
              {sesion?.nombre ?? 'Cargando…'}
            </p>
            <p className="text-xs text-texto-suave">{sesion ? ROL_LABEL[sesion.rol] : ''}</p>
          </div>
        </button>
      </div>

      {editandoFoto && sesion && (
        <FotoModal
          nombre={sesion.nombre}
          fotoActual={sesion.foto}
          titulo="Mi foto"
          onGuardar={async (foto) => {
            const r = await api.miFoto(foto);
            setSesion((s) => (s ? { ...s, foto: r.foto } : s));
          }}
          onClose={() => setEditandoFoto(false)}
        />
      )}
    </aside>
  );
}
