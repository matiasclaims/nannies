import type { Rol } from '../rbac/permissions';

/** Payload del JWT y forma de `req.user` tras autenticar. */
export interface UsuarioAutenticado {
  sub: string; // id del usuario
  nombre: string;
  rol: Rol;
  nannieId: string | null; // presente solo si rol = NANNIE
}

// Augmenta Express.Request para tipar req.user en toda la app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UsuarioAutenticado;
    }
  }
}
