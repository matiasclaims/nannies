/**
 * Parseo y validación de la importación de familias (M5 · Bloque 4).
 * Acepta pegado desde Google Sheets (tabuladores) o CSV (comas). Mapea por
 * NOMBRE de encabezado (no por orden); las columnas desconocidas se ignoran.
 */
import type { FamiliaImport, NinoInput, Plaza } from '@/lib/api';

export interface FilaImport {
  indice: number; // número de fila de datos (1..N) para mostrar
  familia: FamiliaImport;
  estado: 'ok' | 'error' | 'duplicado';
  errores: string[];
  resumen: string;
}

export interface FamiliaExistente {
  nombreContacto: string;
  apellido?: string | null;
  plaza: string;
}

/** Quita acentos y pasa a minúsculas, para comparar encabezados y valores. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

const VERDADERO = new Set(['si', 'sí', 'x', 'true', '1', 'verdadero', 'yes']);
const FALSO = new Set(['no', 'false', '0', 'falso', '']);

function aBooleano(v: string): boolean | undefined {
  const n = norm(v);
  if (VERDADERO.has(n)) return true;
  if (FALSO.has(n)) return false;
  return undefined;
}

function aPlaza(v: string): Plaza | null {
  const n = norm(v);
  if (n === 'toluca' || n === 'tol') return 'TOLUCA';
  if (n === 'queretaro' || n === 'qro' || n === 'qro.') return 'QUERETARO';
  return null;
}

// Encabezado (normalizado) → campo de Familia.
const FAMILIA: Record<string, keyof FamiliaImport> = {
  contacto: 'nombreContacto',
  apellido: 'apellido',
  zona: 'zona',
  telefono: 'telefono',
  email: 'email',
  correo: 'email',
  emergencia: 'numeroEmergencia',
  direccion: 'direccion',
  expectativas: 'expectativas',
  reglas: 'reglasEspecificas',
  mascotas: 'mascotas',
  audiovisual: 'autorizacionAudiovisual',
};
const FAMILIA_BOOL: Record<string, keyof FamiliaImport> = {
  adulto_responsable: 'adultoResponsablePresente',
  adulto: 'adultoResponsablePresente',
  consent_reglamento: 'consentimientoReglamento',
  consent_medico: 'consentimientoMedico',
  consent_privacidad: 'consentimientoPrivacidad',
  consent_confidencialidad: 'consentimientoConfidencialidad',
};
// Sufijo (tras pequeN_) → campo de Niño.
const NINO: Record<string, keyof NinoInput> = {
  nombre: 'nombre',
  salud: 'salud',
  rutinas: 'rutinas',
  caracter: 'caracter',
  reaccion: 'reaccionAnteLoNuevo',
  tematicas: 'tematicasInteres',
  pantalla: 'restriccionesPantalla',
  riesgo: 'conductasRiesgo',
};

/** Divide texto CSV/TSV respetando comillas. Detecta el separador (tab o coma). */
function parseTabla(texto: string): string[][] {
  const primera = texto.split(/\r?\n/, 1)[0] ?? '';
  const delim = primera.includes('\t') ? '\t' : ',';
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else enComillas = false;
      } else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === delim) { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((x) => x.trim() !== ''));
}

/** Parsea y valida el texto pegado contra las familias existentes (duplicados). */
export function parseImportacion(
  texto: string,
  existentes: FamiliaExistente[],
): { filas: FilaImport[]; error?: string } {
  if (!texto.trim()) return { filas: [], error: 'Pega los datos, con una primera fila de encabezados.' };
  const tabla = parseTabla(texto);
  if (tabla.length < 2) return { filas: [], error: 'Faltan filas: necesito los encabezados y al menos una familia.' };

  const encabezados = tabla[0].map((h) => norm(h));
  const clave = (e: FamiliaExistente) => `${norm(e.nombreContacto)}|${norm(e.apellido ?? '')}|${e.plaza}`;
  const yaExisten = new Set(existentes.map(clave));
  const vistas = new Set<string>();

  const filas: FilaImport[] = tabla.slice(1).map((cols, idx) => {
    const errores: string[] = [];
    const val = (h: string) => {
      const i = encabezados.indexOf(h);
      return i >= 0 ? (cols[i] ?? '').trim() : '';
    };

    const familia: FamiliaImport = { nombreContacto: '', plaza: 'TOLUCA', ninos: [] };
    // Campos de texto de la familia.
    for (const [h, campo] of Object.entries(FAMILIA)) {
      const v = val(h);
      if (v) (familia as unknown as Record<string, unknown>)[campo] = v;
    }
    // Booleanos de la familia.
    for (const [h, campo] of Object.entries(FAMILIA_BOOL)) {
      if (encabezados.includes(h)) {
        const b = aBooleano(val(h));
        if (b !== undefined) (familia as unknown as Record<string, unknown>)[campo] = b;
      }
    }
    // Áreas a trabajar (lista).
    const areas = val('areas') || val('áreas');
    if (areas) familia.areasATrabajar = areas.split(/[,;]/).map((a) => a.trim()).filter(Boolean);
    // Plaza (obligatoria).
    const plazaRaw = val('plaza');
    const plaza = aPlaza(plazaRaw);
    if (!plazaRaw) errores.push('Falta la plaza.');
    else if (!plaza) errores.push(`Plaza no reconocida: "${plazaRaw}" (usa Toluca o Querétaro).`);
    else familia.plaza = plaza;
    // Contacto (obligatorio).
    if (!familia.nombreContacto) errores.push('Falta el nombre de contacto.');

    // Peques 1..3.
    for (const p of [1, 2, 3]) {
      const pre = `peque${p}_`;
      const nombre = val(`${pre}nombre`);
      if (!nombre) continue;
      const nino: NinoInput = { nombre };
      for (const [suf, campo] of Object.entries(NINO)) {
        if (suf === 'nombre') continue;
        const v = val(`${pre}${suf}`);
        if (v) (nino as unknown as Record<string, unknown>)[campo] = v;
      }
      const edad = val(`${pre}edad`);
      if (edad) {
        const n = Number(edad);
        if (!Number.isInteger(n) || n < 0 || n > 18) errores.push(`Peque ${p}: edad no válida ("${edad}").`);
        else nino.edad = n;
      }
      const panal = aBooleano(val(`${pre}panal`) || val(`${pre}pañal`));
      if (panal !== undefined) nino.autorizacionCambioPanal = panal;
      familia.ninos.push(nino);
    }

    // Estado de la fila.
    let estado: FilaImport['estado'] = errores.length ? 'error' : 'ok';
    if (estado === 'ok') {
      const k = `${norm(familia.nombreContacto)}|${norm(familia.apellido ?? '')}|${familia.plaza}`;
      if (yaExisten.has(k) || vistas.has(k)) estado = 'duplicado';
      vistas.add(k);
    }

    const resumen = [
      `${familia.nombreContacto} ${familia.apellido ?? ''}`.trim(),
      familia.plaza === 'TOLUCA' ? 'Toluca' : 'Querétaro',
      familia.ninos.length ? `${familia.ninos.length} peque${familia.ninos.length > 1 ? 's' : ''}` : 'sin peques',
    ].join(' · ');

    return { indice: idx + 1, familia, estado, errores, resumen };
  });

  return { filas };
}

/** Genera el texto CSV de la plantilla (encabezados + una fila de ejemplo). */
export function generarPlantilla(): string {
  const cols = [
    'contacto', 'apellido', 'plaza', 'zona', 'telefono', 'email', 'emergencia', 'direccion',
    'expectativas', 'reglas', 'adulto_responsable', 'mascotas', 'areas', 'audiovisual',
    'consent_reglamento', 'consent_medico', 'consent_privacidad', 'consent_confidencialidad',
    'peque1_nombre', 'peque1_edad', 'peque1_salud', 'peque1_rutinas', 'peque1_caracter', 'peque1_riesgo',
    'peque2_nombre', 'peque2_edad',
  ];
  const ejemplo = [
    'María', 'García', 'Toluca', 'Metepec', '722-000-0000', 'maria@correo.com', '722-111-1111',
    'Calle Falsa 123, portón azul', 'Reforzar lectura', 'Sin dulces después de 6pm', 'Sí', 'Un perro',
    'Atención; Socialización', 'Solo uso interno', 'Sí', 'Sí', 'Sí', 'Sí',
    'Emilia', '5', 'Alergia a nueces', 'Siesta 2pm', 'Tímida al inicio', 'Corre sin ver',
    'Diego', '7',
  ];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return cols.join(',') + '\n' + ejemplo.map(esc).join(',') + '\n';
}
