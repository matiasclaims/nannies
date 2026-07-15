import { cn } from '@/lib/utils';

type Color = 'rosa' | 'azul' | 'morado' | 'verde' | 'rojo';

const BARRA: Record<Color, string> = {
  rosa: 'bg-marca-rosa',
  azul: 'bg-marca-azul',
  morado: 'bg-marca-morado',
  verde: 'bg-marca-verde',
  rojo: 'bg-marca-rojo',
};

interface KpiCardProps {
  titulo: string;
  valor: string;
  nota?: string;
  progreso?: number; // 0-100
  color?: Color;
}

/** Card blanca con sombra + barra de progreso (piel "Claro", KPIs). */
export function KpiCard({ titulo, valor, nota, progreso, color = 'azul' }: KpiCardProps) {
  return (
    <div className="rounded-2xl bg-panel p-4 shadow-card">
      <p className="text-xs font-medium text-texto-suave">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-texto-fuerte">{valor}</p>
      {nota && <p className="text-xs text-texto-suave">{nota}</p>}
      {typeof progreso === 'number' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-fondo">
            <div
              className={cn('h-full rounded-full', BARRA[color])}
              style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-texto-suave">{progreso}%</p>
        </div>
      )}
    </div>
  );
}
