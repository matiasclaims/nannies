/**
 * ============================================================
 *  MATRIZ DE PERMISOS CENTRAL — rol × recurso × campo
 *  Fuente única de verdad para el control de acceso.
 *  (SEGURIDAD §3: "definir la matriz en un solo lugar central,
 *   no dispersa por el código").
 *
 *  Dos capas:
 *   1) ACTION_POLICY  — quién puede EJECUTAR cada acción.
 *   2) FIELD_ACCESS   — qué CAMPOS sensibles recibe cada rol.
 *      El backend NO envía el campo prohibido (no lo esconde:
 *      no lo envía) — SEGURIDAD §2/§3.
 *
 *  Además: reglas de PERTENENCIA (una nannie solo ve lo suyo)
 *  no viven en tablas sino en verificación por request — se
 *  documentan aquí y se aplican en los guards/servicios.
 * ============================================================
 */

// Espejo del enum Rol de Prisma (se mantiene en sync a mano para
// no acoplar la matriz al cliente generado).
export type Rol = 'DIRECTORA' | 'SUBDIRECTORA' | 'NANNIE';

export const ROLES: readonly Rol[] = ['DIRECTORA', 'SUBDIRECTORA', 'NANNIE'] as const;

/**
 * Acciones con consecuencia sobre dinero o estatus de una persona.
 * Principio rector: "automatizar el cálculo, humanizar la decisión de
 * consecuencia" → estas requieren rol DIRECTORA verificado en backend.
 */
export type Accion =
  // Finanzas / consecuencia económica → solo DIRECTORA
  | 'finanzas.margen.ver'
  | 'finanzas.comision.fijar'
  | 'incidencia.descuento.aplicar'
  | 'incidencia.strike.confirmarTercero'
  | 'nannie.tarifa.ver'
  // Operación (asignar, calendario, expedientes, familias, reportes)
  | 'servicio.asignar'
  | 'servicio.override'
  | 'calendario.gestionar'
  | 'familia.gestionar'
  | 'nannie.gestionar'
  | 'reporte.gestionar'
  | 'incidencia.registrar'
  // Auto-servicio de la nannie (sobre lo suyo; ver PERTENENCIA)
  | 'disponibilidad.propia.editar'
  | 'oferta.responder'
  | 'reporte.propio.escribir';

/** Qué roles pueden ejecutar cada acción. */
export const ACTION_POLICY: Record<Accion, readonly Rol[]> = {
  // --- Exclusivas de la Directora (dinero / consecuencia) ---
  'finanzas.margen.ver': ['DIRECTORA'],
  'finanzas.comision.fijar': ['DIRECTORA'],
  'incidencia.descuento.aplicar': ['DIRECTORA'],
  'incidencia.strike.confirmarTercero': ['DIRECTORA'],
  'nannie.tarifa.ver': ['DIRECTORA'],

  // --- Operación: Directora + Subdirectora ---
  'servicio.asignar': ['DIRECTORA', 'SUBDIRECTORA'],
  'servicio.override': ['DIRECTORA', 'SUBDIRECTORA'],
  'calendario.gestionar': ['DIRECTORA', 'SUBDIRECTORA'],
  'familia.gestionar': ['DIRECTORA', 'SUBDIRECTORA'],
  'nannie.gestionar': ['DIRECTORA', 'SUBDIRECTORA'],
  'reporte.gestionar': ['DIRECTORA', 'SUBDIRECTORA'],
  'incidencia.registrar': ['DIRECTORA', 'SUBDIRECTORA'],

  // --- Nannie sobre lo suyo (además requiere check de PERTENENCIA) ---
  'disponibilidad.propia.editar': ['DIRECTORA', 'SUBDIRECTORA', 'NANNIE'],
  'oferta.responder': ['DIRECTORA', 'SUBDIRECTORA', 'NANNIE'],
  'reporte.propio.escribir': ['DIRECTORA', 'SUBDIRECTORA', 'NANNIE'],
};

/**
 * FIELD_ACCESS — campos sensibles por recurso y qué roles los reciben.
 * Un campo NO listado aquí se considera público entre roles autenticados.
 * Un campo listado solo se envía a los roles indicados; a los demás el
 * serializador lo OMITE de la respuesta.
 */
export const FIELD_ACCESS: Record<string, Record<string, readonly Rol[]>> = {
  // PII de menores — SEGURIDAD §2 (máxima protección)
  nino: {
    // Identificable: SOLO Directora
    nombre: ['DIRECTORA'],
    edad: ['DIRECTORA'],
    genero: ['DIRECTORA'],
    // Operativo: Directora + la nannie asignada (vista operativa)
    rutinas: ['DIRECTORA', 'SUBDIRECTORA', 'NANNIE'],
    necesidades: ['DIRECTORA', 'SUBDIRECTORA', 'NANNIE'],
    salud: ['DIRECTORA', 'SUBDIRECTORA', 'NANNIE'],
  },

  // Finanzas — el MARGEN solo a Directora (misma pantalla, sección no enviada)
  finanzas: {
    margen: ['DIRECTORA'],
    comision: ['DIRECTORA', 'SUBDIRECTORA'], // Sub ve el dato operativo, no el margen
    cobroFamilia: ['DIRECTORA', 'SUBDIRECTORA'],
    pagoNannie: ['DIRECTORA', 'SUBDIRECTORA'],
  },

  // Tabulador / tarifas — solo Directora ve la estructura de tabulador
  nannie: {
    nivelTarifaMesActual: ['DIRECTORA', 'SUBDIRECTORA'], // operativo para coordinar pago
    // el tabulador completo (columnas/porcentajes) se gobierna con la
    // acción nannie.tarifa.ver (solo DIRECTORA), no como campo suelto
  },
};

/**
 * PERTENENCIA (ownership) — no es una tabla; es una regla de request.
 * Una NANNIE autenticada solo puede leer/editar recursos cuyo nannieId
 * coincida con el de su token (SEGURIDAD §4). Recursos afectados:
 *  - Disponibilidad, Servicio, OfertaRespuesta, ReporteServicio (M6),
 *    Expediente (M4) del propio id.
 *  - Perfil de Familia/Nino: solo el de familias de SUS servicios, y
 *    siempre filtrado por FIELD_ACCESS.nino.
 * Los guards/servicios deben validarla explícitamente en cada consulta.
 */
export const OWNERSHIP_ENFORCED_RESOURCES = [
  'disponibilidad',
  'servicio',
  'ofertaRespuesta',
  'reporteServicio',
  'expedienteNannie',
] as const;

// --- Helpers de consulta (los guards de NestJS los usarán) ---

export function puedeEjecutar(rol: Rol, accion: Accion): boolean {
  return ACTION_POLICY[accion].includes(rol);
}

/** ¿El rol recibe este campo de este recurso? Campo no listado = visible. */
export function campoVisible(rol: Rol, recurso: string, campo: string): boolean {
  const reglasRecurso = FIELD_ACCESS[recurso];
  if (!reglasRecurso) return true;
  const rolesPermitidos = reglasRecurso[campo];
  if (!rolesPermitidos) return true;
  return rolesPermitidos.includes(rol);
}

/** Devuelve una copia del objeto con solo los campos que el rol puede ver. */
export function filtrarCampos<T extends Record<string, unknown>>(
  rol: Rol,
  recurso: string,
  objeto: T,
): Partial<T> {
  const resultado: Partial<T> = {};
  for (const clave of Object.keys(objeto) as (keyof T)[]) {
    if (campoVisible(rol, recurso, clave as string)) {
      resultado[clave] = objeto[clave];
    }
  }
  return resultado;
}

export function requierePertenencia(recurso: string): boolean {
  return (OWNERSHIP_ENFORCED_RESOURCES as readonly string[]).includes(recurso);
}
