/** Placeholder para módulos aún no construidos (se reemplaza al montarlos). */
export function EnConstruccion({ titulo, modulo }: { titulo: string; modulo: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-dashed border-borde bg-panel p-10 text-center shadow-card">
        <p className="text-lg font-semibold text-texto-fuerte">{titulo}</p>
        <p className="mt-1 text-sm text-texto-suave">
          {modulo} · se construye en su fase, módulo por módulo.
        </p>
      </div>
    </div>
  );
}
