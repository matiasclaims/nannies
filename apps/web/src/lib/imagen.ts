/**
 * Redimensiona una imagen a un cuadrado (recorte centrado) de `lado` px y la
 * devuelve como data URL JPEG. Se corre en el navegador antes de subirla para
 * que lo que se guarda en la BD sea pequeño (~30–50 KB).
 */
export async function redimensionarCuadrada(file: File, lado = 400, calidad = 0.85): Promise<string> {
  const bitmap = await cargarImagen(file);
  const min = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - min) / 2;
  const sy = (bitmap.height - min) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, lado, lado);
  return canvas.toDataURL('image/jpeg', calidad);
}

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Archivo de imagen no válido.'));
    };
    img.src = url;
  });
}
