import { existsSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { PDFDocument as PdfLibDocument, StandardFonts, rgb } from 'pdf-lib';

/** Un archivo de respaldo ya leído del disco, para anexarlo al PDF. */
export interface AnexoArchivo {
  categoria: string;
  nombreArchivo: string;
  ext: string; // pdf | jpg | jpeg | png | webp
  contenido: Buffer;
}

const CATEGORIA_LABEL: Record<string, string> = {
  COMPROBANTE_PAGO: 'Comprobante de pago',
  ESTUDIOS: 'Estudios',
  MEDICAMENTOS: 'Compra de medicamentos',
  OTRO: 'Otro',
};

/** Datos que la hoja/PDF del reporte de incidencia necesita (lo que devuelve
 *  IncidentesService.uno). */
export interface DatosIncidentePdf {
  menor: string;
  familia: string;
  fechaHoraIncidente: string;
  lugar: string;
  nannie: string;
  relatoNannie: string;
  medidasInmediatas: string | null;
  evolucionMenor: string | null;
  doctor: string | null;
  fechaConsulta: string | null;
  diagnostico: string | null;
  tratamiento: string | null;
  documentacionEntregada: string | null;
  medidasNannies: string | null;
  coberturaAplico: boolean;
  coberturaImporte: number | null;
  paquete: { folio: number; horasTotales: number; fechaContratacion: string } | null;
  anexos: string | null;
}

const AZUL = '#17323b';
const SUAVE = '#6b7280';
const LINEA = '#e5e7eb';

const NOTA_PIE =
  'En Nannies sabemos que cuidar a un pequeño implica una enorme responsabilidad y no la tomamos a la ligera. Nos comprometemos a asumir nuestra parte, aprender de cada experiencia y actuar siempre con sensibilidad, compromiso y responsabilidad, porque detrás de cada servicio está lo más importante para una familia: sus hijos.';

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

function rutaLogo(): string | null {
  const p = join(__dirname, '..', '..', '..', 'assets', 'nannies-logo.png');
  return existsSync(p) ? p : null;
}

function textoCobertura(d: DatosIncidentePdf): string {
  if (!d.coberturaAplico) {
    return 'En este caso la cobertura médica no fue aplicable conforme a los términos del beneficio.';
  }
  const paq = d.paquete
    ? ` incluido en el paquete de ${d.paquete.horasTotales} horas contratado el ${fechaLarga(d.paquete.fechaContratacion)}`
    : '';
  const imp = d.coberturaImporte != null ? ` Importe: ${money(d.coberturaImporte)} MXN.` : '';
  return `Atención médica solventada por Nannies, conforme al beneficio de cobertura médica${paq}.${imp}`;
}

/** Arma el PDF del reporte de incidencia en el documento dado y lo cierra. */
export function construirPdfIncidente(doc: PDFKit.PDFDocument, d: DatosIncidentePdf): void {
  const M = 50;
  const x0 = M;
  const ancho = doc.page.width - M * 2;
  const bottom = doc.page.height - M;
  let y = M;

  const espacio = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = M;
    }
  };

  // --- Encabezado con marca ---
  const logo = rutaLogo();
  if (logo) {
    try {
      doc.image(logo, x0, y, { height: 34 });
    } catch {
      doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL).text('Nannies Child Care', x0, y);
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL).text('Nannies Child Care', x0, y);
  }
  doc.font('Helvetica-Bold').fontSize(15).fillColor(AZUL)
    .text('Reporte de incidencia', x0, y + 2, { width: ancho, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(SUAVE)
    .text(fechaLarga(d.fechaHoraIncidente), x0, y + 22, { width: ancho, align: 'right' });
  y += 48;
  doc.moveTo(x0, y).lineTo(x0 + ancho, y).lineWidth(1).strokeColor(LINEA).stroke();
  y += 16;

  // --- Datos (dos columnas) ---
  const datos: [string, string][] = [
    ['Menor', d.menor || '—'],
    ['Padre, madre o tutor', d.familia || '—'],
    ['Fecha y hora del incidente', fechaHora(d.fechaHoraIncidente)],
    ['Lugar del incidente', d.lugar || '—'],
    ['Nannie a cargo', d.nannie || '—'],
  ];
  const colAncho = ancho / 2;
  for (let i = 0; i < datos.length; i += 2) {
    const fila = datos.slice(i, i + 2);
    let hFila = 0;
    fila.forEach(([label, valor], j) => {
      const cx = x0 + j * colAncho;
      doc.font('Helvetica').fontSize(8).fillColor(SUAVE).text(label, cx, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(AZUL).text(valor, cx, y + 11, { width: colAncho - 10 });
      hFila = Math.max(hFila, 11 + doc.heightOfString(valor, { width: colAncho - 10 }));
    });
    espacio(hFila + 10);
    y += hFila + 10;
  }
  y += 4;

  // --- Bloques ---
  const bloque = (titulo: string, texto: string | null, cita = false) => {
    if (!texto || !texto.trim()) return;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(AZUL);
    const hTitulo = doc.heightOfString(titulo, { width: ancho });
    espacio(hTitulo + 24); // que el título no quede huérfano al pie
    doc.text(titulo, x0, y, { width: ancho });
    y = doc.y + 2;
    doc.font(cita ? 'Helvetica-Oblique' : 'Helvetica').fontSize(10).fillColor(cita ? AZUL : '#333333');
    const cuerpo = cita ? `“${texto}”` : texto;
    doc.text(cuerpo, x0 + (cita ? 10 : 0), y, { width: ancho - (cita ? 10 : 0), align: 'left' });
    y = doc.y + 10;
  };

  bloque('Incidente relatado por la Nannie', d.relatoNannie, true);
  bloque('Medidas aplicadas inmediatamente', d.medidasInmediatas);
  bloque('Evolución del menor', d.evolucionMenor);
  bloque('Doctor que realizó la valoración', d.doctor);
  bloque('Fecha de la consulta', d.fechaConsulta ? fechaLarga(d.fechaConsulta) : null);
  bloque('Diagnóstico', d.diagnostico);
  bloque('Tratamiento indicado', d.tratamiento);
  bloque('Documentación entregada', d.documentacionEntregada);
  bloque('Medidas implementadas por Nannies', d.medidasNannies);
  bloque('Cobertura médica', textoCobertura(d));
  bloque('Anexos', d.anexos);

  // --- Nota institucional + firma ---
  doc.font('Helvetica').fontSize(9).fillColor(SUAVE);
  const hNota = doc.heightOfString(NOTA_PIE, { width: ancho, align: 'center' });
  espacio(hNota + 70);
  y += 10;
  doc.text(NOTA_PIE, x0, y, { width: ancho, align: 'center' });
  y = doc.y + 24;
  doc.font('Helvetica').fontSize(10).fillColor(SUAVE).text('Atentamente', x0, y, { width: ancho, align: 'center' });
  y = doc.y + 18;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(AZUL).text('MCEF Paula Ileana Novales Pérez', x0, y, { width: ancho, align: 'center' });
  y = doc.y + 2;
  doc.font('Helvetica').fontSize(9).fillColor(SUAVE).text('Nannies Child Care', x0, y, { width: ancho, align: 'center' });

  doc.end();
}

/** Nombre de archivo sugerido. */
export function nombreArchivoIncidente(d: DatosIncidentePdf): string {
  const base = (d.menor || 'incidencia').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const fecha = d.fechaHoraIncidente.slice(0, 10);
  return `reporte-incidencia-${base}-${fecha}.pdf`;
}

/** Corre el render de pdfkit y junta su salida en un Buffer. */
function pdfkitABuffer(dibujar: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    dibujar(doc); // la función debe llamar doc.end()
  });
}

/** Genera el PDF del reporte y le ANEXA los archivos de respaldo al final:
 *  una página índice + cada PDF tal cual + cada imagen (JPG/PNG) como página.
 *  Los WEBP u otros formatos no incrustables se omiten (siguen en la app). */
export async function componerPdfIncidente(d: DatosIncidentePdf, anexos: AnexoArchivo[]): Promise<Uint8Array> {
  const reporte = await pdfkitABuffer((doc) => construirPdfIncidente(doc, d));
  if (anexos.length === 0) return new Uint8Array(reporte);

  const pdf = await PdfLibDocument.load(reporte);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0x17 / 255, 0x32 / 255, 0x3b / 255);
  const suave = rgb(0x6b / 255, 0x72 / 255, 0x80 / 255);
  const A4: [number, number] = [595.28, 841.89];
  const M = 50;
  const etiqueta = (a: AnexoArchivo) => `${CATEGORIA_LABEL[a.categoria] ?? a.categoria} — ${a.nombreArchivo}`;

  // Página índice de anexos.
  const indice = pdf.addPage(A4);
  let y = A4[1] - M;
  indice.drawText('Documentos anexos', { x: M, y: y - 12, size: 15, font: fontBold, color: azul });
  y -= 40;
  indice.drawText('Archivos de respaldo cargados en este reporte:', { x: M, y, size: 10, font, color: suave });
  y -= 24;
  anexos.forEach((a, i) => {
    indice.drawText(`${i + 1}.  ${etiqueta(a)}`.slice(0, 110), { x: M, y, size: 10, font, color: azul });
    y -= 18;
  });

  for (const a of anexos) {
    const ext = a.ext.toLowerCase();
    try {
      if (ext === 'pdf') {
        const src = await PdfLibDocument.load(a.contenido, { ignoreEncryption: true });
        const copiadas = await pdf.copyPages(src, src.getPageIndices());
        copiadas.forEach((p) => pdf.addPage(p));
      } else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
        const img = ext === 'png' ? await pdf.embedPng(a.contenido) : await pdf.embedJpg(a.contenido);
        const page = pdf.addPage(A4);
        page.drawText(etiqueta(a).slice(0, 110), { x: M, y: A4[1] - M + 8, size: 9, font, color: suave });
        const maxW = A4[0] - M * 2;
        const maxH = A4[1] - M * 2 - 10;
        const escala = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * escala;
        const h = img.height * escala;
        page.drawImage(img, { x: (A4[0] - w) / 2, y: (A4[1] - h) / 2 - 10, width: w, height: h });
      }
      // webp / otros: no incrustables aquí; se quedan disponibles en la app.
    } catch {
      // Archivo corrupto o no incrustable: lo saltamos sin romper el PDF.
    }
  }

  return pdf.save();
}
