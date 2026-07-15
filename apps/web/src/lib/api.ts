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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(cuerpo.message ?? `Error ${res.status}`);
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
};
