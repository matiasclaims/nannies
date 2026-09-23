#!/usr/bin/env bash
#
# Respaldo diario de la BD de PRODUCCION (nannies_prod) en el VPS.
# Guarda un dump comprimido (-Fc, restaurable con pg_restore) en BACKUP_DIR y
# conserva los ultimos RETENER_DIAS dias; los mas viejos se borran solos.
#
# Uso (root en el VPS, normalmente via cron):
#   bash /var/www/nannies/scripts/backup-prod.sh
#
# Restaurar un respaldo (ejemplo):
#   sudo -u postgres pg_restore -d nannies_prod --clean --if-exists /var/backups/nannies/ARCHIVO.dump

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/nannies}"
DB="${DB:-nannies_prod}"
RETENER_DIAS="${RETENER_DIAS:-14}"

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
ARCHIVO="$BACKUP_DIR/${DB}-${TS}.dump"

# pg_dump corre como el superusuario postgres (peer auth). El redireccion la hace
# root, asi que el archivo queda en un directorio de root (sin problemas de permisos).
if ! sudo -u postgres pg_dump -Fc "$DB" > "$ARCHIVO"; then
  echo "$(date '+%F %T') ERROR: pg_dump fallo para $DB" >&2
  rm -f "$ARCHIVO"
  exit 1
fi

# Respaldo vacio = algo salio mal: no lo dejamos.
if [ ! -s "$ARCHIVO" ]; then
  echo "$(date '+%F %T') ERROR: respaldo vacio ($ARCHIVO)" >&2
  rm -f "$ARCHIVO"
  exit 1
fi

# Rotacion: borra dumps mas viejos que RETENER_DIAS.
find "$BACKUP_DIR" -name "${DB}-*.dump" -type f -mtime +"$RETENER_DIAS" -delete

echo "$(date '+%F %T') OK: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
