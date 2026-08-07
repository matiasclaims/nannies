/** Nombre de la nannie pintado con su color designado (mismo color en todo el
 *  sistema). Si no tiene color, hereda el color del texto normal. */
export function NombreNannie({
  nombre,
  color,
  className,
}: {
  nombre: string;
  color?: string | null;
  className?: string;
}) {
  return (
    <span className={className} style={color ? { color } : undefined}>
      {nombre}
    </span>
  );
}
