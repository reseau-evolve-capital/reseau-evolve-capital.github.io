#!/usr/bin/env bash
#
# Sauvegarde du volume MÉDIAS de Strapi (uploads) avec rétention. Complète `backup-db.sh`
# (qui ne couvre QUE la base). À planifier en cron sur le droplet, ex. :
#
#   0 3 * * * cd /opt/strapi && ./backup-db.sh && ./backup-uploads.sh >> /var/log/strapi-backup.log 2>&1
#
# Le provider d'upload est « local » → les binaires vivent dans le volume nommé
# `strapi_strapi-uploads`. On l'archive via un conteneur jetable (pas besoin d'arrêter Strapi).
# Pour une protection off-droplet COMPLÈTE (DB + médias), activer aussi les "Droplet Backups" DO.
set -euo pipefail

VOLUME="${UPLOADS_VOLUME:-strapi_strapi-uploads}"
BACKUP_DIR="${BACKUP_DIR:-/opt/strapi/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="uploads-${STAMP}.tgz"

echo "→ Archive du volume '${VOLUME}'…"
docker run --rm -v "${VOLUME}":/v -v "${BACKUP_DIR}":/backup alpine \
  tar czf "/backup/${OUT}" -C /v .
echo "✅ Écrit : ${BACKUP_DIR}/${OUT} ($(du -h "${BACKUP_DIR}/${OUT}" | cut -f1))"

echo "→ Purge des sauvegardes médias de plus de ${RETENTION_DAYS} jours…"
find "$BACKUP_DIR" -name 'uploads-*.tgz' -type f -mtime "+${RETENTION_DAYS}" -delete
echo "✅ Terminé."

# Restauration (si besoin) :
#   docker run --rm -v strapi_strapi-uploads:/v -v /opt/strapi/backups:/b alpine \
#     sh -c 'cd /v && tar xzf /b/uploads-<STAMP>.tgz && chown -R 1000:1000 /v'
