import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ItemLimpio } from './planeacion.service';

/** Datos que la hoja/PDF necesita (lo que devuelve PlaneacionService.hoja). */
export interface DatosHoja {
  servicioId: string;
  familia: string;
  ninos: string[];
  nannie: string;
  plaza: string;
  tipoServicio: string;
  esPaquete: boolean;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  zona: string | null;
  planeacion: { items: ItemLimpio[]; autor: string | null; fecha: string } | null;
}

// Mismo mapa que el frontend (lib/dominio TIPO_LABEL).
const TIPO_LABEL: Record<string, string> = {
  DAYCARE: 'Daycare',
  NIGHTCARE: 'Nightcare',
  ACOMPANAMIENTO_EVENTO: 'Acompañamiento',
  NANNIE_EXPRESS: 'Nannie express',
  NANNIE_FORANEA: 'Nannie foránea',
  NANNIE_FIESTA_PLAYDATE: 'Fiesta / Play Date',
  LUDOTECA_MOVIL: 'Ludoteca móvil',
};

// Marca Nannies
const AZUL = '#17323b';
const SUAVE = '#6b7280';
const LINEA = '#e5e7eb';
const ROSA = '#f0d6d5';

// Nota al pie de toda planeación (guía flexible + materiales de la familia).
const NOTA_PIE =
  'La presente planeación es una guía flexible que podrá ajustarse durante la jornada, considerando las necesidades, intereses, ritmo y bienestar del niño o de los niños. Si por motivos de descanso, alimentación, salidas o juego espontáneo fuera necesario, las actividades podrán adaptarse, reprogramarse o sustituirse por otras que favorezcan igualmente su desarrollo. Asimismo, para llevar a cabo las actividades propuestas, será necesario que la familia proporcione previamente a la Nannie los materiales indicados en la última columna.';

const etiquetaServicio = (tipo: string, esPaquete: boolean) =>
  esPaquete ? 'Paquete' : (TIPO_LABEL[tipo] ?? tipo);

function fechaLarga(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

// El logo se copia a apps/api/assets (hermano de src y dist), así resuelve igual
// en dev (nest start) y prod (node dist/main.js): __dirname -> .../(src|dist)/
// modules/planeacion, y ../../../assets/ apunta a apps/api/assets.
function rutaLogo(): string | null {
  const p = join(__dirname, '..', '..', '..', 'assets', 'nannies-logo.png');
  return existsSync(p) ? p : null;
}

/** Arma el PDF de la planeación en el documento dado y lo cierra (doc.end()). */
export function construirPdfPlaneacion(doc: PDFKit.PDFDocument, d: DatosHoja): void {
  const M = 50;
  const x0 = M;
  const ancho = doc.page.width - M * 2;

  // --- Encabezado con marca ---
  const logo = rutaLogo();
  if (logo) {
    try {
      doc.image(logo, x0, M, { height: 34 });
    } catch {
      doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL).text('Nannies Child Care', x0, M);
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL).text('Nannies Child Care', x0, M);
  }
  doc.font('Helvetica-Bold').fontSize(15).fillColor(AZUL)
    .text('Planeación del servicio', x0, M + 2, { width: ancho, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(SUAVE)
    .text(`${d.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro'} · Nannies Child Care`, x0, M + 22, { width: ancho, align: 'right' });

  let y = M + 48;
  doc.moveTo(x0, y).lineTo(x0 + ancho, y).lineWidth(1).strokeColor(LINEA).stroke();
  y += 16;

  // --- Datos del servicio (dos columnas) ---
  const datos: [string, string][] = [
    ['Familia', d.familia || '—'],
    ['Nannie', d.nannie || '—'],
    ['Fecha', fechaLarga(d.fecha)],
    ['Horario', `${d.horaInicio}–${d.horaFin}`],
    ['Servicio', etiquetaServicio(d.tipoServicio, d.esPaquete)],
  ];
  if (d.zona) datos.push(['Zona', d.zona]);
  if (d.ninos.length > 0) datos.push([d.ninos.length === 1 ? 'Peque' : 'Peques', d.ninos.join(', ')]);

  const colAncho = ancho / 2;
  for (let i = 0; i < datos.length; i += 2) {
    const fila = datos.slice(i, i + 2);
    let hFila = 0;
    fila.forEach(([label, valor], j) => {
      const cx = x0 + j * colAncho;
      doc.font('Helvetica').fontSize(8).fillColor(SUAVE).text(label, cx, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(AZUL)
        .text(valor, cx, y + 11, { width: colAncho - 10 });
      hFila = Math.max(hFila, 11 + doc.heightOfString(valor, { width: colAncho - 10 }));
    });
    y += hFila + 10;
  }

  y += 6;

  // --- Tabla Hora/Actividad/Objetivo/Material ---
  const items = d.planeacion?.items ?? [];
  const cols = [
    { t: 'Hora', w: 55 },
    { t: 'Actividad', w: 170 },
    { t: 'Objetivo', w: 130 },
    { t: 'Material', w: ancho - 55 - 170 - 130 },
  ];
  const PAD = 5;
  const bottom = doc.page.height - M;

  const encabezadoTabla = (yy: number): number => {
    doc.moveTo(x0, yy + 16).lineTo(x0 + ancho, yy + 16).lineWidth(1.5).strokeColor(ROSA).stroke();
    let cx = x0;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(SUAVE);
    for (const c of cols) {
      doc.text(c.t.toUpperCase(), cx + PAD, yy + 4, { width: c.w - PAD * 2 });
      cx += c.w;
    }
    return yy + 22;
  };

  if (items.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(SUAVE)
      .text('Aún no se ha capturado la planeación de este servicio.', x0, y, { width: ancho });
    doc.end();
    return;
  }

  y = encabezadoTabla(y);
  doc.font('Helvetica').fontSize(9).fillColor(AZUL);
  for (const it of items) {
    const celdas = [it.hora || '—', it.actividad || '', it.objetivo || '—', it.material || '—'];
    const hCelda = celdas.map((txt, i) => doc.heightOfString(txt, { width: cols[i].w - PAD * 2 }));
    const hFila = Math.max(...hCelda) + PAD * 2;

    if (y + hFila > bottom) {
      doc.addPage();
      y = encabezadoTabla(M);
      doc.font('Helvetica').fontSize(9).fillColor(AZUL);
    }

    let cx = x0;
    celdas.forEach((txt, i) => {
      doc.fillColor(AZUL).text(txt, cx + PAD, y + PAD, { width: cols[i].w - PAD * 2 });
      cx += cols[i].w;
    });
    y += hFila;
    doc.moveTo(x0, y).lineTo(x0 + ancho, y).lineWidth(0.5).strokeColor(LINEA).stroke();
  }

  // --- Nota al pie (guía flexible + materiales) ---
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(SUAVE);
  const hNota = doc.heightOfString(NOTA_PIE, { width: ancho, align: 'justify' });
  if (y + 18 + hNota + 16 > bottom) {
    doc.addPage();
    y = M;
  } else {
    y += 18;
  }
  doc.text(NOTA_PIE, x0, y, { width: ancho, align: 'justify' });
  y += hNota + 10;

  doc.font('Helvetica').fontSize(8).fillColor(SUAVE)
    .text('Nannies Child Care · Planeación de actividades del servicio.', x0, Math.min(y, bottom), { width: ancho, align: 'center' });

  doc.end();
}

/** Nombre de archivo sugerido para la descarga. */
export function nombreArchivoPlaneacion(d: DatosHoja): string {
  const fam = (d.familia || 'familia').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `planeacion-${fam}-${d.fecha}.pdf`;
}
