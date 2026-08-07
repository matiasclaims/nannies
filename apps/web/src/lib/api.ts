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
  tipoServicio: TipoServicio;
  formato: Formato;
  numNinos: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  estado: EstadoServicio;
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
  plaza: Plaza;
  zona: string | null;
  nServicios?: number;
  ultimaAtencion?: string | null;
  paqueteActivo?: PaqueteActivo | null;
}

export interface NinoPerfil {
  id: string;
  nombre?: string;
  apellidos?: string | null;
  edad?: number | null;
  genero?: string | null;
  rutinas?: string | null;
  necesidades?: string | null;
  salud?: string | null;
}
export interface ServicioHist {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: TipoServicio;
  nannie: string;
  estado: EstadoServicio;
}
export interface NotaFamilia {
  id: string;
  texto: string;
  autor: string | null;
  fecha: string;
}
export interface PerfilFamilia {
  id: string;
  nombreContacto: string;
  telefono: string | null;
  email: string | null;
  plaza: Plaza;
  zona: string | null;
  estado: string;
  ninos: NinoPerfil[];
  servicios: ServicioHist[];
  notas: NotaFamilia[];
  paqueteActivo: PaqueteActivo | null;
}
export interface NinoInput {
  nombre?: string;
  apellidos?: string;
  edad?: number;
  genero?: string;
  rutinas?: string;
  necesidades?: string;
  salud?: string;
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
  paquetes: { id: string; familia: string; horas: number; monto: number; fecha: string }[];
  individuales: { id: string; familia: string; tipoServicio: TipoServicio; monto: number; fecha: string }[];
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
export interface NominaNannie {
  nannieId: string;
  nombre: string;
  foto: string | null;
  color: string | null;
  nivel: string;
  servicios: NominaServicio[];
  bonos: NominaBono[];
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
  fecha: string;
  cobro: number;
  pago: number | null;
  descuentoNannie: number;
  comision: number;
  ajuste: number;
  margen: number | null;
  pendiente: boolean;
  motivo?: string;
}
export interface BonoLite {
  id: string;
  nannie: string;
  monto: number;
  motivo: string;
  fecha: string;
}
export interface Margen {
  rango: { desde: string; hasta: string };
  servicios: MargenServicio[];
  bonos: BonoLite[];
  totales: {
    cobro: number;
    pago: number;
    descuentoNannie: number;
    comision: number;
    ajuste: number;
    bonos: number;
    margen: number;
    margenNeto: number;
  };
  pendientes: number;
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
  tipoServicio: TipoServicio;
  formato: Formato;
  paqueteId?: string;
  tarifaDia?: number;
  tarifaNoche?: number;
  cobroTotal?: number;
  nivelDia?: 'BASICO' | 'INTERMEDIO' | 'PREMIUM';
  nivelNoche?: 'BASICO' | 'INTERMEDIO' | 'PREMIUM';
  numNinos: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
}

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

  completarServicio: (servicioId: string) =>
    req<Servicio>(`/calendario/servicios/${servicioId}/completar`, { method: 'POST' }),
  editarHorario: (servicioId: string, horaFin: string, tarifaNoche?: number) =>
    req<Servicio>(`/calendario/servicios/${servicioId}/horario`, {
      method: 'PATCH',
      body: JSON.stringify({ horaFin, ...(tarifaNoche != null ? { tarifaNoche } : {}) }),
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
  crearFamilia: (body: { nombreContacto: string; plaza: Plaza; zona?: string; telefono?: string }) =>
    req<FamiliaLite>('/familias', { method: 'POST', body: JSON.stringify(body) }),
  crearPaquete: (familiaId: string, horas: number, asignacionManual = false) =>
    req<PaqueteActivo>(`/familias/${familiaId}/paquetes`, {
      method: 'POST',
      body: JSON.stringify({ horas, asignacionManual }),
    }),
  // M5 · Perfil de familia
  perfilFamilia: (id: string) => req<PerfilFamilia>(`/familias/${id}`),
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
    diasSemana: number[];
    horaInicio: string;
    horaFin: string;
    fechaInicio: string;
    tipoServicio: TipoServicio;
    numNinos: number;
    zona: string;
    nannieId?: string;
  }) =>
    req<{ creados: number; fechas: string[]; horasConsumidas: number; restantes: number }>(
      '/asignacion/programar-paquete',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  // M2 · Asignación
  recomendar: (body: {
    plaza: Plaza;
    zona: string;
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
  editarFinanza: (servicioId: string, body: { comision?: number | null; ajuste?: number | null }) =>
    req<unknown>(`/finanzas/servicios/${servicioId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  proyeccionPaquete: (paqueteId: string) =>
    req<Proyeccion>(`/familias/paquetes/${paqueteId}/proyeccion`),

  niveles: () => req<Niveles>('/finanzas/niveles'),
  cerrarMes: (anio: number, mes: number) =>
    req<CierreResultado>('/finanzas/cierre-mes', {
      method: 'POST',
      body: JSON.stringify({ anio, mes }),
    }),
};
