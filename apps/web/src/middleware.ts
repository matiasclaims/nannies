import { NextResponse, type NextRequest } from 'next/server';

/**
 * Redirección de conveniencia (UX): sin cookie de sesión → /login.
 * NO es el control de acceso real — la verdad vive en el backend, que
 * verifica el JWT en cada endpoint (SEGURIDAD §3). Esto solo evita
 * mostrar el shell a alguien sin sesión.
 */
export function middleware(req: NextRequest) {
  const tieneSesion = req.cookies.has('access_token');
  const esLogin = req.nextUrl.pathname.startsWith('/login');

  if (!tieneSesion && !esLogin) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (tieneSesion && esLogin) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Aplica solo a páginas: excluye /api, artefactos de Next y cualquier
  // archivo estático (rutas con punto/extensión, ej. /nannies-logo.png).
  matcher: ['/((?!api|_next/static|_next/image|.*\\.).*)'],
};
