#!/usr/bin/env bash
#
# Sauvegarde de la base Strapi (pg_dump compressé) avec rétention, à planifier en cron
# sur le droplet. Exemple de crontab (sauvegarde quotidienne à 03h00) :
#
#   0 3 * * * cd /opt/strapi && ./backup-db.sh >> /var/log/strapi-backup.log 2>&1
#
# Granularité DB. Pour une protection off-droplet COMPLÈTE (DB + volume médias),
# activer en plus les "Droplet Backups" DigitalOcean. Cf. docs/infra/RUNBOOK-cms-digitalocean.md
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-strapi-db}"
DB_USER="${DATABASE_USERNAME:-strapi}"
DB_NAME="${DATABASE_NAME:-strapi}"
BACKUP_DIR="${BACKUP_DIR:-/opt/strapi/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/strapi-${STAMP}.sql.gz"

echo "→ Dump de '${DB_NAME}' depuis le conteneur '${DB_CONTAINER}'…"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip >"$OUT"
echo "✅ Écrit : ${OUT} ($(du -h "$OUT" | cut -f1))"

echo "→ Purge des sauvegardes de plus de ${RETENTION_DAYS} jours…"
find "$BACKUP_DIR" -name 'strapi-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete
echo "✅ Terminé."
