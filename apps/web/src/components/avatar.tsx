import { cn } from '@/lib/utils';

/** Avatar de perfil: muestra la foto o, si no hay, las iniciales del nombre
 *  sobre un círculo de marca (sin emojis, según la regla del sistema). */
export function Avatar({
  foto,
  nombre,
  size = 40,
  color,
  className,
}: {
  foto?: string | null;
  nombre: string;
  size?: number;
  /** Color de la nannie: dibuja un anillo alrededor del avatar. */
  color?: string | null;
  className?: string;
}) {
  // Anillo de color (con un pequeño hueco blanco) cuando hay color de nannie.
  const anillo = color ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${color}` } : undefined;
  const dim = { width: size, height: size, ...anillo };
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nombre}
        style={dim}
        className={cn('shrink-0 rounded-full object-cover', className)}
      />
    );
  }
  return (
    <span
      style={{ ...dim, fontSize: Math.round(size * 0.38) }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-marca-azul/12 font-semibold text-marca-azul',
        className,
      )}
      aria-label={nombre}
    >
      {iniciales(nombre)}
    </span>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '··';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}
