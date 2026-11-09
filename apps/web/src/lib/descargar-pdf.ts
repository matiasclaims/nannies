/**
 * Descarga/guarda un PDF del backend de forma robusta en CUALQUIER dispositivo.
 *
 * El problema: en iPhone (Safari o navegadores embebidos tipo WhatsApp) un PDF
 * se ABRE en pantalla pero no se "baja" solo —iOS no tiene descargas automáticas—
 * y window.print() tampoco deja guardarlo. La solución universal es la hoja de
 * compartir nativa del sistema (Web Share API con archivos): el usuario toca
 * "Guardar en Archivos/Fotos" o lo manda a donde quiera, en un toque.
 *
 * Estrategia:
 *  - Móvil con soporte de compartir archivos  -> navigator.share (hoja nativa).
 *  - Escritorio / Android sin share de archivo -> descarga normal (<a download>).
 */
export async function descargarPdf(url: string, nombreFallback: string): Promise<void> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('No se pudo generar el PDF.');
  const blob = await res.blob();

  // Nombre: del header si viene, si no el de respaldo.
  const cd = res.headers.get('content-disposition') ?? '';
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  let nombre = nombreFallback;
  if (m) {
    try {
      nombre = decodeURIComponent(m[1].replace(/"$/, ''));
    } catch {
      nombre = m[1].replace(/"$/, '');
    }
  }

  const file = new File([blob], nombre, { type: blob.type || 'application/pdf' });

  // Móvil: hoja de compartir nativa (Guardar en Archivos/Fotos, enviar, etc.).
  const nav = navigator as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean;
    share?: (data?: { files?: File[]; title?: string }) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: nombre });
      return;
    } catch (e) {
      // El usuario canceló: no hacemos nada (ni descarga de respaldo).
      if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return;
      // Cualquier otro fallo: caemos a la descarga normal de abajo.
    }
  }

  // Escritorio / Android: descarga normal.
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
}
