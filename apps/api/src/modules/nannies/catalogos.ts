/**
 * Catálogos fijos del expediente de la nannie (Paula, 2026-08-05).
 * Los documentos/cursos son fijos; por nannie se guarda cuáles ya cumplió
 * (arreglos de claves). "documentacionCompleta"/"capacitacionCompleta" se
 * derivan de tener TODAS las claves del catálogo.
 */
export interface ItemChecklist {
  clave: string;
  nombre: string;
  fuente?: string;
}

export const CATALOGO_DOCUMENTOS: ItemChecklist[] = [
  { clave: 'ine', nombre: 'INE' },
  { clave: 'cv', nombre: 'CV' },
  { clave: 'comprobante_domicilio', nombre: 'Comprobante de domicilio' },
  { clave: 'comprobante_estudios', nombre: 'Comprobante de estudios' },
  { clave: 'referencias_laborales', nombre: '2 referencias laborales' },
  { clave: 'referencias_personales', nombre: '2 referencias personales' },
  { clave: 'antecedentes_no_penales', nombre: 'Carta de antecedentes no penales' },
  { clave: 'convenio_colaboracion', nombre: 'Convenio de colaboración laboral' },
  { clave: 'formato_zonas', nombre: 'Formato de zonas' },
];

const CAPACITATE = 'Capacítate para el Empleo · Fundación Carlos Slim';
export const CATALOGO_CURSOS: ItemChecklist[] = [
  { clave: 'cuidador_ninos', nombre: 'Cuidador de niños', fuente: CAPACITATE },
  { clave: 'primer_respondiente', nombre: 'Primer respondiente', fuente: CAPACITATE },
  { clave: 'promotor_desarrollo', nombre: 'Promotor del desarrollo infantil', fuente: CAPACITATE },
  { clave: 'jugar_para_crecer', nombre: 'Jugar para crecer', fuente: CAPACITATE },
  { clave: 'cuidado_infantil', nombre: 'Cuidado infantil', fuente: 'Edutin' },
];

export const CLAVES_DOCUMENTOS = CATALOGO_DOCUMENTOS.map((d) => d.clave);
export const CLAVES_CURSOS = CATALOGO_CURSOS.map((c) => c.clave);

/** Filtra un arreglo a solo las claves válidas del catálogo (sin duplicados). */
export function soloClavesValidas(entrada: string[], validas: string[]): string[] {
  const set = new Set(validas);
  return [...new Set(entrada)].filter((k) => set.has(k));
}
