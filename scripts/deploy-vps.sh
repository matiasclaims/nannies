#!/usr/bin/env bash
#
# Despliegue a PRODUCCION (VPS Hostinger - https://nannies.mx).
#
# Actualiza el codigo desde git, aplica migraciones de base de datos,
# recompila API y Web, y reinicia SOLO los procesos de nannies.
# NO toca "valhalla-backend" (biblioteca digital), que convive en el mismo VPS.
#
# Uso (dentro del VPS, como root):
#   bash /var/www/nannies/scripts/deploy-vps.sh
#
# Requisitos ya instalados en el VPS: git, node/npm, pm2, PostgreSQL local.
# La configuracion (.env con DATABASE_URL, STORAGE_DIR, JWT, etc.) ya vive en
# el VPS y este script NO la toca.

set -euo pipefail

# Raiz del repo = carpeta padre de este script (funciona desde cualquier ruta).
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
echo ">> Repo: $REPO_DIR"
echo ">> Rama actual: $(git rev-parse --abbrev-ref HEAD)"

echo ""
echo ">> [1/6] Trayendo el codigo mas reciente (git pull origin main)..."
git pull origin main

echo ""
echo ">> [2/6] Instalando dependencias (npm install en la raiz del monorepo)..."
npm install

echo ""
echo ">> [3/6] Generando cliente Prisma y aplicando migraciones (migrate deploy)..."
# migrate deploy solo aplica las migraciones pendientes; nunca borra datos.
( cd apps/api && npx prisma generate && npx prisma migrate deploy )

echo ""
echo ">> [4/6] Compilando API (nest build -> apps/api/dist)..."
npm run build --workspace apps/api

echo ""
echo ">> [5/6] Compilando Web (next build -> apps/web/.next)..."
npm run build --workspace apps/web

echo ""
echo ">> [6/6] Reiniciando procesos de nannies (no toca valhalla)..."
pm2 restart nannies-api nannies-web --update-env
pm2 save

echo ""
echo ">> Listo. Despliegue completo."
echo ">> Verifica en: https://nannies.mx"
echo ">> Estado de procesos:"
pm2 list
