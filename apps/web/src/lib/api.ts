/**
 * Cliente HTTP hacia la API NestJS. Usa ruta relativa `/api`: Next reenvía
 * (rewrite/proxy) a la API real, así frontend y API son MISMO ORIGEN y la
 * cookie de sesión funciona igual en local y en Vercel (SEGURIDAD §4).
 * No guarda tokens en localStorage.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export type Rol = 'DIRECTORA' | 'SUBDIRECTORA' | 'NANNIE';

export interface Sesion {
  sub: string;
  nombre: string;
  rol: Rol;
  nannieId: string | null;
  debeCambiarPassword: boolean;
  foto: string | null;
}

// M4 · Expediente de nannie
export interface NannieExpediente {
  id: string;
  nombre: string;
  foto: string | null;
  especialidad: string | null;
  correo: string | null;
  telefono: string | null;
  plaza: Plaza;
  zonas: string[];
  color: string | null;
  rango: string;
  estado: 'ACTIVA' | 'PAUSA' | 'PRUEBA' | 'BAJA';
  documentacionCompleta: boolean;
  capacitacionCompleta: boolean;
  documentosEntregados: string[];
  cursosCompletados: string[];
  serviciosAcumulados: number;
  tieneCuenta: boolean;
}
export interface NanniePerfil extends NannieExpediente {
  nivelActual: string;
}
export interface NotaNannie {
  id: string;
  texto: string;
  autor: string;
  fecha: string;
}
export interface DocumentoNannie {
  clave: string;
  tipo: 'DOCUMENTO' | 'CURSO';
  nombreArchivo: string;
  subidoEn: string;
  url: string | null;
}
// M5 · Colonias de trabajo (Toluca)
export interface ColoniaCat {
  id: string;
  municipio: string;
  colonia: string;
}
export interface ColoniaDias {
  coloniaId: string;
  municipio: string;
  colonia: string;
  dias: number[]; // 0=dom … 6=sáb
}
export interface ColoniasNannie {
  bloqueadas: boolean;
  colonias: ColoniaDias[];
}
export interface NuevaNannie {
  nombre: string;
  correo: string;
  telefono?: string;
  plaza: Plaza;
  zonas: string[];
  color?: string;
}

// M4 · Incidencias
export interface ReglaIncidencia {
  numero: number;
  situacion: string;
  esStrike: boolean;
  tipo?: string;
  consecuenciaTexto: string;
  notaObligatoria?: boolean;
  noCulposa?: boolean;
}
export interface PenalidadPendiente {
  clave: string;
  regla: number | null;
  descripcion: string;
  tipo: string;
  pct?: number;
  consecuenciaTexto: string;
  ocurrenciasIds: string[];
}
export interface IncidenciaHistorial {
  id: string;
  regla: number;
  situacion: string;
  noCulposa: boolean;
  fecha: string;
  registradaPor: string;
  nota: string | null;
  estado: string;
}
export interface BandejaNannie {
  historial: IncidenciaHistorial[];
  pendientes: PenalidadPendiente[];
  progreso: { etiqueta: string; actual: number; umbral: number }[];
}
export interface ServicioDescuento {
  servicioId: string;
  fecha: string;
  tipo: TipoServicio;
  pago: number | null;
  descuentoActual: number;
}
// M4 · Evaluación de desempeño
export type ClavePilar =
  | 'atencionInfantil'
  | 'cumplimientoServicio'
  | 'comunicacion'
  | 'profesionalismo'
  | 'puntualidad';
export interface PilarEval {
  clave: ClavePilar;
  titulo: string;
  peso: number;
  evalua: string;
  incluye: string;
}
export interface NotasEval {
  atencionInfantil: number;
  cumplimientoServicio: number;
  comunicacion: number;
  profesionalismo: number;
  puntualidad: number;
}
export interface EvaluacionData {
  semana: string;
  evaluacion: (NotasEval & { calificacion: number; evaluadaPor: string; nota: string | null }) | null;
  incidenciasSemana: { id: string; situacion: string; fecha: string; pilar: ClavePilar | null }[];
  historial: { semana: string; calificacion: number }[];
}
export interface AltaNannieResultado {
  id: string;
  correo: string;
  correoEnviado: boolean;
  passwordTemporal?: string;
}

/** Error con código HTTP; status = 0 si ni siquiera se pudo conectar. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    // Falla de red / servidor inalcanzable (ej. API despertando).
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => ({}))) as { message?: string };
    // Sesión expirada o ausente: manda a login (salvo en el propio login).
    if (
      res.status === 401 &&
      typeof window !== 'undefined' &&
      !path.startsWith('/auth/login') &&
      window.location.pathname !== '/login'
    ) {
      window.location.href = '/login';
    }
    throw new ApiError(res.status, cuerpo.message ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Tipos de M1 (espejo de las respuestas del backend; fechas ISO) ---

export type EstadoDisponibilidad = 'DISPONIBLE' | 'BLOQUEADO' | 'TEMPORAL';
export type EstadoServicio =
  | 'OFERTADO'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'COMPLETADO'
  | 'CANCELADO';
export type TipoServicio =
  | 'DAYCARE'
  | 'NIGHTCARE'
  | 'ACOMPANAMIENTO_EVENTO'
  | 'NANNIE_EXPRESS'
  | 'NANNIE_FORANEA'
  | 'NANNIE_FIESTA_PLAYDATE'
  | 'LUDOTECA_MOVIL';
export type Formato = 'INDIVIDUAL' | 'PAQUETE';
export type Plaza = 'TOLUCA' | 'QUERETARO';

export interface Disponibilidad {
  id: string;
  nannieId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoDisponibilidad;
  fechaReintegro: string | null;
}

export interface Servicio {
  id: string;
  familiaId: string;
  nannieId: string | null;
  plaza: Plaza;
  zona: string;
  direccion: string | null;
  tipoServicio: TipoServicio;
  formato: Formato;
  numNinos: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  estado: EstadoServicio;
  requierePlaneacion: boolean;
  /** Solo para coordinación (en su calendario). La nannie recibe null / []. */
  familia?: string | null;
  ninos?: string[];
}

export interface NuevaDisponibilidad {
  // Sin nannieId: cada quien marca solo la suya (el backend usa el token).
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado?: EstadoDisponibilidad;
  fechaReintegro?: string;
  semanas?: number; // repetir el bloque N semanas seguidas (1 = solo esa fecha)
}

export type RespuestaOferta = 'ACEPTO' | 'RECHAZO';

export interface NannieLite {
  id: string;
  nombre: string;
  foto: string | null;
  color: string | null;
  zonas: string[];
  plaza: Plaza;
  estado: 'ACTIVA' | 'PAUSA' | 'PRUEBA';
}

// --- M2 · Asignación / M5 mínimo (Familias) ---

export type Rango = 'BASE' | 'ROOKIE' | 'JUNIOR' | 'SENIOR';

export interface Proyeccion {
  familia: string;
  plaza: Plaza;
  paquete: { horasTotales: number; horasConsumidas: number; horasRestantes: number };
  sesiones: {
    fecha: string;
    horaInicio: string;
    horaFin: string;
    tipoServicio: TipoServicio;
    nannie: string;
    estado: EstadoServicio;
  }[];
}

/** Avance PÚBLICO del paquete (la familia lo ve sin login). Sin nannie. */
export interface AvancePaquete {
  familia: string;
  asignacionManual: boolean;
  horasTotales: number;
  horasConsumidas: number;
  horasRestantes: number;
  estado: string;
  sesiones: {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    duracionHoras: number;
    tipoServicio: TipoServicio;
    estado: EstadoServicio;
  }[];
}

export interface PaqueteActivo {
  id: string;
  horasTotales: number;
  horasConsumidas: number;
  horasRestantes: number;
  asignacionManual: boolean;
}

export interface FamiliaLite {
  id: string;
  nombreContacto: string;
  apellido?: string | null;
  plaza: Plaza;
  zona: string | null;
  estado?: string;
  inactiva?: boolean;
  diasSinServicio?: number;
  nServicios?: number;
  ninosNombres?: string[];
  ultimaAtencion?: string | null;
  paqueteActivo?: PaqueteActivo | null;
}

export interface NinoPerfil {
  id: string;
  nombre?: string;
  apellidos?: string | null;
  edad?: number | null;
  edadMeses?: number | null;
  genero?: string | null;
  rutinas?: string | null;
  necesidades?: string | null;
  salud?: string | null;
  reaccionAnteLoNuevo?: string | null;
  caracter?: string | null;
  tematicasInteres?: string | null;
  restriccionesPantalla?: string | null;
  conductasRiesgo?: string | null;
  autorizacionCambioPanal?: boolean | null;
}
/** Dashboard 360 (M7) — solo lectura, del mes en curso. margen null si no es Directora. */
export interface Dashboard {
  mes: string;
  servicios: { total: number; completados: number; proximos: number; hoy: number; porAsignar: number };
  aceptacion: { global: number | null; respondidas: number; porNannie: { nannieId: string; nombre: string; tasa: number; ofertas: number }[] };
  cobertura: { porcentaje: number; sinCobertura: number };
  zonasDemanda: { zona: string; servicios: number }[];
  cancelaciones: { total: number; cobradas: number; noCobradas: number };
  ingresoNoCapturado: number;
  horasPagadas: number;
  paquetesActivos: number;
  paquetesPorAgotarse: { paqueteId: string; familiaId: string; familia: string; horasTotales: number; restantes: number; consumidoPct: number; desde: string }[];
  adeudosPorDefinir: { servicioId: string; familiaId: string; familia: string; fecha: string; horaInicio: string; horaFin: string; horas: number; nannie: string; zona: string }[];
  porAsignarLista: { servicioId: string; fecha: string; horaInicio: string; familiaId: string; familia: string; zona: string; tipoServicio: TipoServicio }[];
  serviciosPorNannie: { nannieId: string; nombre: string; color: string | null; plaza: Plaza; total: number }[];
  serviciosPorTipo: { tipo: TipoServicio; total: number }[];
  comparativoAnual: { anio: number; horas: number }[];
  comparativoMensual: {
    anios: number[];
    series: { anio: number; toluca: number[]; queretaro: number[]; total: number[] }[];
  };
  manana: { horaInicio: string; zona: string; familia: string; nannie: string; porAsignar: boolean }[];
  actividad: { estado: EstadoServicio; familiaId: string; familia: string; nannie: string; zona: string; fecha: string }[];
  margen: number | null;
}
/** Panorama personal de la nannie (M7 · vista nannie). */
export interface MiPanorama {
  nombre: string;
  foto: string | null;
  especialidad: string | null;
  rangoPermanente: string;
  nivelMes: string;
  horasMes: number;
  serviciosMes: number;
  ofertas: number;
  calificacionPapas: { promedio: number | null; total: number };
  calificacionAgencia: { promedio: number | null; total: number };
  horasPorSemana: { semana: string; horas: number }[];
  horasPorMes: { mes: string; label: string; horas: number }[];
}
/** Proyección de fechas de la nannie (agenda a futuro, imprimible). */
export interface MiProyeccion {
  nombre: string;
  sesiones: {
    fecha: string;
    horaInicio: string;
    horaFin: string;
    tipoServicio: TipoServicio;
    familia: string;
    zona: string;
    direccion: string | null;
    pendiente: boolean;
  }[];
}
/** Paquete que ve la nannie (solo donde tiene sesiones asignadas · vista nannie). */
export interface MiPaquete {
  paqueteId: string;
  familia: string;
  estado: 'ACTIVO' | 'CONSUMIDO' | 'CANCELADO';
  horasTotales: number;
  horasConsumidas: number;
  horasRestantes: number;
  sesiones: {
    fecha: string;
    horaInicio: string;
    horaFin: string;
    duracionHoras: number;
    tipoServicio: TipoServicio;
    estado: EstadoServicio;
    mia: boolean;
  }[];
}
/** Reporte general (M6) — una fila por nannie con su actividad del periodo. */
export interface ReporteGeneral {
  desde: string;
  hasta: string;
  totales: { servicios: number; horas: number; incidencias: number; encuestasPendientes: number };
  encuestasPendientes: { familia: string; nannie: string; fecha: string }[];
  nannies: {
    nannieId: string;
    nombre: string;
    color: string | null;
    prueba: boolean;
    servicios: number;
    horas: number;
    calificacionPapas: number | null;
    evaluacionPapasN: number;
    evaluacionAgencia: number | null;
    incidencias: number;
  }[];
}
/** Reporte detallado de una nannie en el periodo (M6 · Bloque 2). */
export interface ReporteNannie {
  desde: string;
  hasta: string;
  nannie: { id: string; nombre: string; color: string | null; prueba: boolean; especialidad: string | null };
  kpis: { servicios: number; horas: number; calificacionPapas: number | null; evaluacionPapasN: number; evaluacionAgencia: number | null; incidencias: number };
  reportes: { familia: string; fecha: string; tipoServicio: TipoServicio; actividades: string; animoNino: string; incidentes: string | null; notas: string | null }[];
  evaluacionesPapas: { familia: string; fecha: string; calificacion: number | null; volveriaContratar: boolean | null; comentario: string | null }[];
  incidencias: { situacion: string; fecha: string; nota: string | null; condonada: boolean }[];
  evaluacionesAgencia: { fecha: string; familia: string; calificacion: number; nota: string | null }[];
}
/** Evaluación de coordinación POR SERVICIO (Paula 2026-09-03). */
export interface PendienteEvalCoord {
  tipo: 'INDIVIDUAL' | 'PAQUETE';
  id: string; // servicioId o paqueteId
  nannieId: string;
  nannie: string;
  familia: string;
  fecha: string;
  detalle: string;
}
export interface DetalleEvalCoord extends PendienteEvalCoord {
  incidencias: { id: string; situacion: string; fecha: string; pilar: ClavePilar | null }[];
  evaluacion: (NotasEval & { calificacion: number; evaluadaPor: string; nota: string | null }) | null;
}
export interface HistorialEvalCoord {
  id: string;
  tipo: 'INDIVIDUAL' | 'PAQUETE';
  fecha: string;
  familia: string;
  detalle: string;
  calificacion: number;
  evaluadaPor: string;
  nota: string | null;
}
/** Encuesta de papás (M6 · 6.2) — contexto público que ve el papá. */
export interface EncuestaPublica {
  respondido: boolean;
  fecha: string;
  tipoServicio: TipoServicio;
  nannie: string | null;
}
/** Resumen propio de la nannie (solo su promedio global). */
export interface MiResumenEval {
  total: number;
  promedio: number | null;
}
/** Resumen para coordinación: promedio + aviso <7.5 + respuestas individuales. */
export interface ResumenEvalNannie {
  total: number;
  promedio: number | null;
  alertaPrueba: boolean;
  respuestas: {
    familia: string;
    fecha: string;
    calificacion: number | null;
    volveriaContratar: boolean | null;
    comentario: string | null;
  }[];
}
/** Reporte de servicio (M6 · 6.1). animoNino: Muy bien / Bien / Regular / Difícil. */
export interface ReporteServicio {
  actividades: string;
  animoNino: string;
  incidentes: string | null;
  notas: string | null;
  autor: string;
  fecha?: string;
}
export interface ServicioHist {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: TipoServicio;
  nannie: string;
  estado: EstadoServicio;
  reporte: ReporteServicio | null;
  /** Si el servicio nació de un paquete de horas. */
  esPaquete: boolean;
  /** Consumo del paquete de ESA sesión (solo si esPaquete y no está cancelada). */
  paquete: { consumidas: number; remanentes: number; totales: number } | null;
}
export interface NotaFamilia {
  id: string;
  texto: string;
  autor: string | null;
  fecha: string;
}
export interface PerfilFamilia {
  id: string;
  inactiva: boolean;
  diasSinServicio: number;
  nombreContacto: string;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  numeroEmergencia: string | null;
  plaza: Plaza;
  zona: string | null;
  direccion: string | null;
  estado: string;
  expectativas: string | null;
  reglasEspecificas: string | null;
  adultoResponsablePresente: boolean | null;
  mascotas: string | null;
  areasATrabajar: string[];
  autorizacionAudiovisual: string | null;
  consentimientoReglamento: boolean;
  consentimientoMedico: boolean;
  consentimientoPrivacidad: boolean;
  consentimientoConfidencialidad: boolean;
  ninos: NinoPerfil[];
  servicios: ServicioHist[];
  notas: NotaFamilia[];
  paqueteActivo: PaqueteActivo | null;
}
/** Ficha OPERATIVA de la familia para la nannie (M5, Opción A). Los campos
 *  ocultos por rol llegan ausentes, por eso todo es opcional. */
export interface FichaFamilia {
  id: string;
  nombreContacto?: string;
  apellido?: string | null;
  telefono?: string | null;
  email?: string | null;
  numeroEmergencia?: string | null;
  plaza?: Plaza;
  zona?: string | null;
  direccion?: string | null;
  expectativas?: string | null;
  reglasEspecificas?: string | null;
  adultoResponsablePresente?: boolean | null;
  mascotas?: string | null;
  areasATrabajar?: string[];
  autorizacionAudiovisual?: string | null;
  ninos: NinoPerfil[];
}
export interface NinoInput {
  nombre?: string;
  apellidos?: string;
  edad?: number;
  edadMeses?: number;
  genero?: string;
  rutinas?: string;
  necesidades?: string;
  salud?: string;
  reaccionAnteLoNuevo?: string;
  caracter?: string;
  tematicasInteres?: string;
  restriccionesPantalla?: string;
  conductasRiesgo?: string;
  autorizacionCambioPanal?: boolean;
}
/** Una familia a importar (cardex + peques). M5 · Bloque 4. */
export interface FamiliaImport {
  nombreContacto: string;
  apellido?: string;
  plaza: Plaza;
  zona?: string;
  telefono?: string;
  email?: string;
  numeroEmergencia?: string;
  direccion?: string;
  expectativas?: string;
  reglasEspecificas?: string;
  adultoResponsablePresente?: boolean;
  mascotas?: string;
  areasATrabajar?: string[];
  autorizacionAudiovisual?: string;
  consentimientoReglamento?: boolean;
  consentimientoMedico?: boolean;
  consentimientoPrivacidad?: boolean;
  consentimientoConfidencialidad?: boolean;
  ninos: NinoInput[];
}
export interface ResultadoImport {
  creadas: number;
  total: number;
  resultados: { nombreContacto: string; ok: boolean; id?: string; error?: string }[];
}
/** Campos editables del cardex de la familia (M5). Todos opcionales. */
export interface FamiliaInput {
  nombreContacto?: string;
  apellido?: string;
  plaza?: Plaza;
  zona?: string;
  telefono?: string;
  email?: string;
  numeroEmergencia?: string;
  direccion?: string;
  expectativas?: string;
  reglasEspecificas?: string;
  adultoResponsablePresente?: boolean;
  mascotas?: string;
  areasATrabajar?: string[];
  autorizacionAudiovisual?: string;
  consentimientoReglamento?: boolean;
  consentimientoMedico?: boolean;
  consentimientoPrivacidad?: boolean;
  consentimientoConfidencialidad?: boolean;
  estado?: string;
}

export interface Candidata {
  nannieId: string;
  nombre: string;
  foto: string | null;
  color: string | null;
  zonas: string[];
  rango: Rango;
  serviciosSemana: number;
  bloque: string;
  aproximada: boolean;
  faltaInicioMin: number;
  faltaFinMin: number;
  distanciaKm: number | null;
}

export interface MiReporte {
  mes: { anio: number; mes: number };
  horasMes: number;
  serviciosMes: number;
  ganadoMes: number;
  horasPorSemana: { semana: string; horas: number }[];
}

export interface Ingresos {
  rango: { desde: string; hasta: string };
  paquetes: {
    id: string;
    familia: string;
    horas: number;
    monto: number;
    fecha: string;
    comision: number | null;
    comisionBeneficiarioId: string | null;
  }[];
  individuales: { id: string; familia: string; tipoServicio: TipoServicio; monto: number; fecha: string; fechaServicio: string }[];
  horasPagadas: number;
  totales: { paquetes: number; individuales: number; total: number };
}

export interface NominaServicio {
  id: string;
  tipoServicio: TipoServicio;
  familia: string;
  fecha: string;
  duracionHoras: number;
  monto: number | null; // null = tarifa pendiente de definir (ya neto del descuento)
  descuento?: number; // descuento por incidencia aplicado a este servicio
  motivo?: string;
}
export interface NominaBono {
  id: string;
  monto: number;
  motivo: string;
  fecha: string;
}
export interface NominaComision {
  monto: number;
  concepto: string;
  fecha: string;
}
export interface NominaNannie {
  nannieId: string;
  nombre: string;
  foto: string | null;
  color: string | null;
  nivel: string;
  servicios: NominaServicio[];
  bonos: NominaBono[];
  comisiones: NominaComision[];
  total: number;
  tienePendientes: boolean;
  pagado: boolean;
  documentacionCompleta: boolean;
  capacitacionCompleta: boolean;
  strikesPendientes: number;
}
export interface Nomina {
  rango: { desde: string; hasta: string };
  nannies: NominaNannie[];
  total: number;
}

export interface MargenServicio {
  servicioId: string;
  nannie: string;
  familia: string;
  zona: string;
  tipoServicio: TipoServicio;
  fecha: string; // fecha del servicio (cuándo se da)
  completado: boolean;
  cobro: number;
  pago: number | null; // informativo: solo si ya se completó
  comision: number;
  comisionBeneficiarioId: string | null;
  ajuste: number;
}
export interface BonoLite {
  id: string;
  nannie: string;
  monto: number;
  motivo: string;
  fecha: string;
}
export interface ComisionPaqueteLite {
  id: string;
  familia: string;
  monto: number;
  fecha: string;
}
export interface Margen {
  rango: { desde: string; hasta: string };
  servicios: MargenServicio[]; // servicios cuyo INGRESO cae este mes (para editar comisión/ajuste)
  bonos: BonoLite[];
  comisionesPaquete: ComisionPaqueteLite[];
  totales: {
    ingresos: number;
    ingresosIndividuales: number;
    ingresosPaquetes: number;
    ajuste: number;
    comision: number;
    comisionesPaquete: number;
    pago: number; // pago a nannies del mes (por completado)
    bonos: number;
    margenNeto: number;
  };
  pendientes: number; // pagos de nannie pendientes de tarifa este mes
}

export interface NivelNannie {
  nannieId: string;
  nombre: string;
  rango: string;
  nivelActual: string;
  serviciosAcumulados: number;
}
export interface CierreRegistro {
  nannie: string;
  anio: number;
  mes: number;
  horasMesPrevio: number;
  nivelAsignado: string;
}
export interface Niveles {
  nannies: NivelNannie[];
  cierres: CierreRegistro[];
}
export interface CierreResultado {
  mesCerrado: { anio: number; mes: number };
  aplicaA: { anio: number; mes: number };
  resultados: {
    nannie: string;
    horas: number;
    nivelAnterior: string;
    nivelAsignado: string;
    cambio: boolean;
  }[];
}

export interface NuevoServicio {
  familiaId: string;
  plaza: Plaza;
  zona: string;
  coloniaId?: string;
  direccion?: string;
  tipoServicio: TipoServicio;
  formato: Formato;
  paqueteId?: string;
  tarifaDia?: number;
  tarifaNoche?: number;
  cobroTotal?: number;
  nivelDia?: 'BASICO' | 'INTERMEDIO' | 'PREMIUM';
  nivelNoche?: 'BASICO' | 'INTERMEDIO' | 'PREMIUM';
  numNinos: number;
  requierePlaneacion?: boolean;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  // Desborde de paquete: qué hacer con las horas que exceden el saldo.
  desbordeModo?: 'INDIVIDUAL' | 'PAQUETE_NUEVO' | 'POR_DEFINIR';
  desbordeCobro?: number;
  desbordePaqueteHoras?: number;
}

/** Decisión de desborde para el flujo de extender (merodeo). */
export type DesbordeDecision = {
  desbordeModo: 'INDIVIDUAL' | 'PAQUETE_NUEVO' | 'POR_DEFINIR';
  desbordeCobro?: number;
  desbordePaqueteHoras?: number;
};

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const api = {
  login: (email: string, password: string) =>
    req<{ rol: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => req<Sesion>('/auth/me'),
  // Foto de perfil propia (barra lateral).
  miFoto: (foto: string | null) =>
    req<{ ok: true; foto: string | null }>('/auth/mi-foto', {
      method: 'PATCH',
      body: JSON.stringify({ foto }),
    }),

  // M1 · Calendario
  listarServicios: (f: { desde?: string; hasta?: string; nannieId?: string; estado?: string }) =>
    req<Servicio[]>(`/calendario/servicios${qs(f)}`),
  listarDisponibilidad: (f: { desde?: string; hasta?: string; nannieId?: string }) =>
    req<Disponibilidad[]>(`/calendario/disponibilidad${qs(f)}`),
  crearDisponibilidad: (body: NuevaDisponibilidad) =>
    req<{ creados: number }>('/calendario/disponibilidad', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  editarDisponibilidad: (
    id: string,
    body: { horaInicio?: string; horaFin?: string; estado?: EstadoDisponibilidad },
  ) =>
    req<Disponibilidad>(`/calendario/disponibilidad/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  eliminarDisponibilidad: (id: string) =>
    req<{ ok: true }>(`/calendario/disponibilidad/${id}`, { method: 'DELETE' }),

  reporteDeServicio: (servicioId: string) =>
    req<ReporteServicio | null>(`/reportes/servicio/${servicioId}`),
  // M6 · 6.2 — Encuesta de papás
  linkEncuesta: (servicioId: string) =>
    req<{ token: string }>(`/evaluaciones/servicio/${servicioId}/link`),
  encuestaPublica: (token: string) => req<EncuestaPublica>(`/evaluaciones/encuesta/${token}`),
  responderEncuesta: (
    token: string,
    dto: { calificacion: number; volveriaContratar: boolean; comentario?: string },
  ) => req<{ ok: boolean }>(`/evaluaciones/encuesta/${token}`, { method: 'POST', body: JSON.stringify(dto) }),
  miResumenEval: () => req<MiResumenEval>('/evaluaciones/mi-resumen'),
  dashboard: () => req<Dashboard>('/dashboard'),
  reporteGeneral: (desde: string, hasta: string) =>
    req<ReporteGeneral>(`/reportes/general?desde=${desde}&hasta=${hasta}`),
  reporteNannie: (nannieId: string, desde: string, hasta: string) =>
    req<ReporteNannie>(`/reportes/nannie/${nannieId}?desde=${desde}&hasta=${hasta}`),
  resumenEvalNannie: (nannieId: string) =>
    req<ResumenEvalNannie>(`/evaluaciones/nannie/${nannieId}/resumen`),
  guardarReporte: (
    servicioId: string,
    dto: { actividades: string; animoNino: string; incidentes?: string; notas?: string },
  ) => req<{ ok: boolean }>(`/reportes/servicio/${servicioId}`, { method: 'PUT', body: JSON.stringify(dto) }),
  completarServicio: (servicioId: string) =>
    req<Servicio>(`/calendario/servicios/${servicioId}/completar`, { method: 'POST' }),
  editarHorario: (servicioId: string, horaFin: string, tarifaNoche?: number, desborde?: DesbordeDecision) =>
    req<Servicio>(`/calendario/servicios/${servicioId}/horario`, {
      method: 'PATCH',
      body: JSON.stringify({ horaFin, ...(tarifaNoche != null ? { tarifaNoche } : {}), ...(desborde ?? {}) }),
    }),
  resolverDesborde: (
    servicioId: string,
    body: { modo: 'INDIVIDUAL' | 'PAQUETE_NUEVO'; cobro?: number; paqueteHoras?: number },
  ) =>
    req<{ ok: true; modo: string; paqueteId?: string }>(
      `/calendario/servicios/${servicioId}/resolver-desborde`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  reasignarServicio: (servicioId: string, nannieId: string) =>
    req<{ ok: true }>(`/calendario/servicios/${servicioId}/reasignar`, {
      method: 'PATCH',
      body: JSON.stringify({ nannieId }),
    }),
  cancelarServicio: (servicioId: string, cobrar: boolean, motivo?: string) =>
    req<{ ok: true }>(`/calendario/servicios/${servicioId}/cancelar`, {
      method: 'PATCH',
      body: JSON.stringify({ cobrar, ...(motivo ? { motivo } : {}) }),
    }),
  reprogramarServicio: (servicioId: string, nuevaFecha: string, horaInicio?: string) =>
    req<{ ok: true }>(`/calendario/servicios/${servicioId}/reprogramar`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevaFecha, ...(horaInicio ? { horaInicio } : {}) }),
    }),

  // M1 · Ofertas y respuestas (1.3)
  listarNannies: () => req<NannieLite[]>('/calendario/nannies'),
  ofertar: (servicioId: string, nannieId: string) =>
    req<Servicio>('/calendario/ofertas', {
      method: 'POST',
      body: JSON.stringify({ servicioId, nannieId }),
    }),
  responderOferta: (servicioId: string, respuesta: RespuestaOferta) =>
    req<unknown>(`/calendario/ofertas/${servicioId}/responder`, {
      method: 'POST',
      body: JSON.stringify({ respuesta }),
    }),

  // M5 mínimo · Familias (selector + alta rápida)
  listarFamilias: () => req<FamiliaLite[]>('/familias'),
  crearFamilia: (body: {
    nombreContacto: string;
    plaza: Plaza;
    apellido?: string;
    zona?: string;
    telefono?: string;
    email?: string;
    numeroEmergencia?: string;
    direccion?: string;
  }) => req<FamiliaLite>('/familias', { method: 'POST', body: JSON.stringify(body) }),
  editarFamilia: (id: string, body: FamiliaInput) =>
    req<{ ok: true }>(`/familias/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  importarFamilias: (familias: FamiliaImport[]) =>
    req<ResultadoImport>('/familias/importar', { method: 'POST', body: JSON.stringify({ familias }) }),
  crearPaquete: (familiaId: string, horas: number, asignacionManual = false) =>
    req<PaqueteActivo>(`/familias/${familiaId}/paquetes`, {
      method: 'POST',
      body: JSON.stringify({ horas, asignacionManual }),
    }),
  eliminarPaquete: (paqueteId: string) =>
    req<{ ok: true }>(`/familias/paquetes/${paqueteId}`, { method: 'DELETE' }),
  // M5 · Perfil de familia
  perfilFamilia: (id: string) => req<PerfilFamilia>(`/familias/${id}`),
  // M5 · Ficha operativa (vista de la nannie asignada)
  fichaFamilia: (id: string) => req<FichaFamilia>(`/familias/${id}/ficha`),
  crearNino: (familiaId: string, body: NinoInput) =>
    req<unknown>(`/familias/${familiaId}/ninos`, { method: 'POST', body: JSON.stringify(body) }),
  editarNino: (ninoId: string, body: NinoInput) =>
    req<unknown>(`/familias/ninos/${ninoId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  eliminarNino: (ninoId: string) =>
    req<{ ok: true }>(`/familias/ninos/${ninoId}`, { method: 'DELETE' }),
  crearNota: (familiaId: string, texto: string) =>
    req<unknown>(`/familias/${familiaId}/notas`, { method: 'POST', body: JSON.stringify({ texto }) }),
  eliminarNota: (notaId: string) =>
    req<{ ok: true }>(`/familias/notas/${notaId}`, { method: 'DELETE' }),
  programarPaquete: (body: {
    paqueteId: string;
    fechas: string[];
    horaInicio: string;
    horaFin: string;
    tipoServicio: TipoServicio;
    numNinos: number;
    zona: string;
    coloniaId?: string;
    direccion?: string;
    nannieId?: string;
  }) =>
    req<{ creados: number; fechas: string[]; omitidas: string[]; horasConsumidas: number; restantes: number }>(
      '/asignacion/programar-paquete',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  // M2 · Asignación
  recomendar: (body: {
    plaza: Plaza;
    zona: string;
    coloniaId?: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    tipoServicio?: TipoServicio;
  }) => req<{ candidatas: Candidata[]; total: number }>('/asignacion/recomendar', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  asignar: (body: NuevoServicio & { nannieId: string }) =>
    req<Servicio>('/asignacion/asignar', { method: 'POST', body: JSON.stringify(body) }),

  // M3 · Finanzas
  ingresos: (desde: string, hasta: string) =>
    req<Ingresos>(`/finanzas/ingresos${qs({ desde, hasta })}`),
  nomina: (desde: string, hasta: string) =>
    req<Nomina>(`/finanzas/nomina${qs({ desde, hasta })}`),
  miReporte: () => req<MiReporte>('/finanzas/mi-reporte'),
  miPanorama: () => req<MiPanorama>('/mi-panorama'),
  miProyeccion: () => req<MiProyeccion>('/mi-proyeccion'),
  misPaquetes: () => req<MiPaquete[]>('/mis-paquetes'),

  // M4 · Expediente de nannies
  listarExpedientes: () => req<NannieExpediente[]>('/nannies'),
  perfilNannie: (id: string) => req<NanniePerfil>(`/nannies/${id}`),
  crearNannie: (body: NuevaNannie) =>
    req<AltaNannieResultado>('/nannies', { method: 'POST', body: JSON.stringify(body) }),
  editarNannie: (id: string, body: Partial<Omit<NannieExpediente, 'id' | 'correo' | 'tieneCuenta' | 'serviciosAcumulados'>>) =>
    req<{ ok: true }>(`/nannies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  darDeBajaNannie: (id: string) =>
    req<{ ok: true }>(`/nannies/${id}/baja`, { method: 'POST' }),
  fotoNannie: (id: string, foto: string | null) =>
    req<{ ok: true; foto: string | null }>(`/nannies/${id}/foto`, {
      method: 'PATCH',
      body: JSON.stringify({ foto }),
    }),
  // Bitácora de coordinación (solo Paula + Jackie).
  notasNannie: (id: string) => req<NotaNannie[]>(`/nannies/${id}/notas`),
  agregarNotaNannie: (id: string, texto: string) =>
    req<{ ok: true }>(`/nannies/${id}/notas`, { method: 'POST', body: JSON.stringify({ texto }) }),
  borrarNotaNannie: (notaId: string) =>
    req<{ ok: true }>(`/nannies/notas/${notaId}`, { method: 'DELETE' }),
  // Documentos del expediente
  documentosDeNannie: (id: string) => req<DocumentoNannie[]>(`/nannies/${id}/documentos`),
  misDocumentos: () => req<DocumentoNannie[]>('/mis-documentos'),
  // M5 · Colonias de trabajo
  catalogoColonias: () => req<ColoniaCat[]>('/colonias-toluca'),
  misColonias: () => req<ColoniasNannie>('/mis-colonias'),
  coloniasDeNannie: (id: string) => req<ColoniasNannie>(`/nannies/${id}/colonias`),
  guardarColoniasDeNannie: (id: string, colonias: { coloniaId: string; dias: number[] }[], bloqueadas?: boolean) =>
    req<{ ok: true }>(`/nannies/${id}/colonias`, {
      method: 'PUT',
      body: JSON.stringify({ colonias, ...(bloqueadas !== undefined ? { bloqueadas } : {}) }),
    }),
  subirMiDocumento: (clave: string, nombreArchivo: string, contenido: string) =>
    req<{ ok: true }>('/mis-documentos', {
      method: 'POST',
      body: JSON.stringify({ clave, nombreArchivo, contenido }),
    }),
  borrarMiDocumento: (clave: string) =>
    req<{ ok: true }>(`/mis-documentos/${clave}`, { method: 'DELETE' }),
  cambiarMiPassword: (actual: string, nueva: string) =>
    req<{ ok: true }>('/nannies/mi-password', {
      method: 'POST',
      body: JSON.stringify({ actual, nueva }),
    }),

  // M4 · Incidencias
  catalogoIncidencias: () => req<ReglaIncidencia[]>('/incidencias/catalogo'),
  incidenciasDeNannie: (id: string) => req<BandejaNannie>(`/incidencias/nannie/${id}`),
  registrarIncidencia: (nannieId: string, regla: number, nota?: string) =>
    req<{ ok: true }>('/incidencias', {
      method: 'POST',
      body: JSON.stringify({ nannieId, regla, ...(nota ? { nota } : {}) }),
    }),
  aplicarIncidencia: (
    nannieId: string,
    ocurrenciasIds: string[],
    extra?: { servicioId?: string; monto?: number },
  ) =>
    req<{ ok: true; aplicado?: string }>('/incidencias/aplicar', {
      method: 'POST',
      body: JSON.stringify({ nannieId, ocurrenciasIds, ...(extra ?? {}) }),
    }),
  serviciosDescuento: (id: string) =>
    req<ServicioDescuento[]>(`/incidencias/nannie/${id}/servicios`),
  descartarIncidencia: (id: string) =>
    req<{ ok: true }>(`/incidencias/${id}/descartar`, { method: 'POST' }),
  condonarIncidencia: (nannieId: string, ocurrenciasIds: string[]) =>
    req<{ ok: true }>('/incidencias/condonar', {
      method: 'POST',
      body: JSON.stringify({ nannieId, ocurrenciasIds }),
    }),
  // M4 · Evaluación de desempeño
  pilaresEval: () => req<PilarEval[]>('/evaluaciones/pilares'),
  evaluacionDeNannie: (id: string, semana?: string) =>
    req<EvaluacionData>(`/evaluaciones/nannie/${id}${semana ? `?semana=${semana}` : ''}`),
  guardarEvaluacion: (id: string, body: NotasEval & { semana: string; nota?: string }) =>
    req<{ ok: true; calificacion: number }>(`/evaluaciones/nannie/${id}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  // M4 (Paula 2026-09-03) · Evaluación de coordinación POR SERVICIO
  evalCoordPendientes: () =>
    req<{ total: number; pendientes: PendienteEvalCoord[] }>('/evaluaciones-coord/pendientes'),
  evalCoordServicio: (servicioId: string) =>
    req<DetalleEvalCoord>(`/evaluaciones-coord/servicio/${servicioId}`),
  guardarEvalCoordServicio: (servicioId: string, body: NotasEval & { nota?: string }) =>
    req<{ ok: true; calificacion: number }>(`/evaluaciones-coord/servicio/${servicioId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  evalCoordPaquete: (paqueteId: string, nannieId: string) =>
    req<DetalleEvalCoord>(`/evaluaciones-coord/paquete/${paqueteId}/nannie/${nannieId}`),
  guardarEvalCoordPaquete: (paqueteId: string, nannieId: string, body: NotasEval & { nota?: string }) =>
    req<{ ok: true; calificacion: number }>(`/evaluaciones-coord/paquete/${paqueteId}/nannie/${nannieId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  evalCoordHistorial: (nannieId: string) =>
    req<HistorialEvalCoord[]>(`/evaluaciones-coord/nannie/${nannieId}/historial`),
  margen: (desde: string, hasta: string) =>
    req<Margen>(`/finanzas/margen${qs({ desde, hasta })}`),
  crearBono: (nannieId: string, monto: number, motivo: string) =>
    req<unknown>('/finanzas/bonos', {
      method: 'POST',
      body: JSON.stringify({ nannieId, monto, motivo }),
    }),
  eliminarBono: (id: string) => req<{ ok: true }>(`/finanzas/bonos/${id}`, { method: 'DELETE' }),
  marcarPago: (nannieId: string, semana: string, pagado: boolean) =>
    req<{ ok: true; pagado: boolean }>('/finanzas/nomina/pago', {
      method: 'POST',
      body: JSON.stringify({ nannieId, semana, pagado }),
    }),
  editarFinanza: (
    servicioId: string,
    body: { comision?: number | null; comisionBeneficiarioId?: string | null; ajuste?: number | null },
  ) =>
    req<unknown>(`/finanzas/servicios/${servicioId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  editarComisionPaquete: (
    paqueteId: string,
    body: { comision?: number | null; comisionBeneficiarioId?: string | null },
  ) =>
    req<unknown>(`/finanzas/paquetes/${paqueteId}/comision`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  proyeccionPaquete: (paqueteId: string) =>
    req<Proyeccion>(`/familias/paquetes/${paqueteId}/proyeccion`),
  enlaceAvance: (paqueteId: string) =>
    req<{ token: string }>(`/familias/paquetes/${paqueteId}/enlace-avance`),
  avancePaquete: (token: string) => req<AvancePaquete>(`/familias/avance/${token}`),

  niveles: () => req<Niveles>('/finanzas/niveles'),
  cerrarMes: (anio: number, mes: number) =>
    req<CierreResultado>('/finanzas/cierre-mes', {
      method: 'POST',
      body: JSON.stringify({ anio, mes }),
    }),
};
