/**
 * Proxy de API: el navegador llama a `/api/*` (mismo origen) y Next lo
 * reenvía a la API real. En local apunta a http://localhost:3001/api;
 * en Vercel se define API_PROXY_TARGET con la URL de la API desplegada.
 */
const target = process.env.API_PROXY_TARGET || 'http://localhost:3001/api';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${target}/:path*` }];
  },
};

export default nextConfig;
