/**
 * Espejo del catálogo de documentos y cursos del expediente (fuente:
 * apps/api/.../nannies/catalogos.ts). Fijo; por nannie se guardan las claves
 * cumplidas.
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
