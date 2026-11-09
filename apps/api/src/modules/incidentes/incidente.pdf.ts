import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
