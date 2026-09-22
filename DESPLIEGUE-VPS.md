# Despliegue — Nannies Child Care

El sistema tiene **dos entornos vivos** que salen del **mismo código** (rama `main`).
Lo que cambia entre ellos es la configuración (`.env`) y los datos.

| | **Preview** (Vercel + Render) | **Producción / VPS** (Hostinger) |
|---|---|---|
| URL | La de Vercel (para que Paula revise) | https://nannies.mx |
| Para qué | Pruebas y aprobación de cambios | Operación real |
| Base de datos | Supabase (preview) | PostgreSQL en el propio VPS |
| Archivos (expedientes) | Supabase Storage | Disco del VPS (`STORAGE_DIR`) |
| Datos | De prueba / demo | Reales |
| Cómo se actualiza | **Automático** al hacer `push` a `main` | **Manual** (script en el VPS) |

## Flujo de trabajo

1. Se desarrolla y se prueba en **local**.
2. `git push origin main` → **el preview se actualiza solo** (Vercel + Render corre `prisma migrate deploy` contra Supabase).
3. Paula revisa en el preview.
4. Cuando está aprobado → se despliega a **producción (VPS)** con el script de abajo.

> El **push NO actualiza el VPS**. El VPS solo se actualiza cuando corres el script a propósito. Así producción nunca cambia por accidente.

## Desplegar a producción (VPS)

Requisito: que el cambio ya esté en `main` (o sea, ya en el preview).

1. Conéctate al VPS por SSH (o consola web de Hostinger):
   ```bash
   ssh root@187.124.85.231
   ```
2. Corre el script de despliegue:
   ```bash
   bash /var/www/nannies/scripts/deploy-vps.sh
   ```
3. Al terminar, verifica que https://nannies.mx cargue y muestre el cambio.

El script hace, en orden y deteniéndose si algo falla:

1. `git pull origin main` — trae el código nuevo.
2. `npm install` — dependencias (rápido si no cambiaron).
3. `prisma generate` + `prisma migrate deploy` — aplica migraciones pendientes (nunca borra datos).
4. `nest build` — recompila la API.
5. `next build` — recompila la Web.
6. `pm2 restart nannies-api nannies-web` — reinicia **solo** los procesos de nannies.

**No toca** `valhalla-backend` (la biblioteca digital que convive en el mismo VPS).

## Datos del VPS (referencia)

- Repo: `/var/www/nannies`
- Procesos pm2: `nannies-api` (id 1), `nannies-web` (id 2). Ajeno: `valhalla-backend` (id 0).
- API: `node dist/main.js` desde `apps/api`, escucha en `localhost:3001`.
- Web: `next start` desde `apps/web`, escucha en `localhost:3000`; nginx enruta `nannies.mx` → :3000.
- La Web proxea `/api/*` a `http://localhost:3001/api` (default de `next.config.mjs`, correcto en el VPS).
- Config sensible (`DATABASE_URL`, `STORAGE_DIR`, JWT, etc.) vive en el `.env` del VPS y el script **no** la modifica.

## Comandos útiles en el VPS

```bash
pm2 list                      # estado de los 3 procesos
pm2 logs nannies-api          # logs de la API en vivo
pm2 logs nannies-web          # logs de la Web en vivo
pm2 restart nannies-api       # reiniciar solo la API
```

## Pendientes de producción (antes de considerar el VPS "en vivo de verdad")

- [ ] Establecer las **contraseñas reales** de las cuentas (hoy hay temporales).
- [ ] Definir y cargar los **datos reales** (nannies, familias) en la BD del VPS.
- [ ] Parte 8 del setup: firewall (`ufw`) + `pm2 startup` para que reviva tras reinicio del VPS.
