/**
 * Cliente HTTP hacia la API NestJS. Usa ruta relativa `/api`: Next reenvía
 * (rewrite/proxy) a la API real, así frontend y API son MISMO ORIGEN y la
 * cookie de sesión funciona igual en local y en Vercel (SEGURIDAD §4).
 * No guarda tokens en localStorage.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export interface Sesion {
  sub: string;
  nombre: string;
  rol: 'DIRECTORA' | 'SUBDIRECTORA' | 'NANNIE';
  nannieId: string | null;
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
}

export type RespuestaOferta = 'ACEPTO' | 'RECHAZO';

export interface NannieLite {
  id: string;
  nombre: string;
  zonas: string[];
  plaza: Plaza;
  estado: 'ACTIVA' | 'PAUSA' | 'PRUEBA';
}

// --- M2 · Asignación / M5 mínimo (Familias) ---

export type Rango = 'BASE' | 'ROOKIE' | 'JUNIOR' | 'SENIOR';

export interface PaqueteActivo {
  id: string;
  horasTotales: number;
  horasConsumidas: number;
  horasRestantes: number;
}

export interface FamiliaLite {
  id: string;
  nombreContacto: string;
  plaza: Plaza;
  zona: string | null;
  paqueteActivo?: PaqueteActivo | null;
}

export interface Candidata {
  nannieId: string;
  nombre: string;
  zonas: string[];
  rango: Rango;
  serviciosSemana: number;
  bloque: string;
  aproximada: boolean;
  faltaInicioMin: number;
  faltaFinMin: number;
}

export interface NuevoServicio {
  familiaId: string;
  plaza: Plaza;
  zona: string;
  tipoServicio: TipoServicio;
  formato: Formato;
  paqueteId?: string;
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

  // M1 · Calendario
  listarServicios: (f: { desde?: string; hasta?: string; nannieId?: string; estado?: string }) =>
    req<Servicio[]>(`/calendario/servicios${qs(f)}`),
  listarDisponibilidad: (f: { desde?: string; hasta?: string; nannieId?: string }) =>
    req<Disponibilidad[]>(`/calendario/disponibilidad${qs(f)}`),
  crearDisponibilidad: (body: NuevaDisponibilidad) =>
    req<Disponibilidad>('/calendario/disponibilidad', {
      method: 'POST',
      body: JSON.stringify(body),
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
  crearPaquete: (familiaId: string, horas: number) =>
    req<PaqueteActivo>(`/familias/${familiaId}/paquetes`, {
      method: 'POST',
      body: JSON.stringify({ horas }),
    }),

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
};
