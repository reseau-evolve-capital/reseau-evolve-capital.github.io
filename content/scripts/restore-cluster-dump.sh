#!/usr/bin/env bash
#
# Restaure un dump cluster Supabase (pg_dumpall, .gz) dans la base "strapi" LOCALE
# (conteneur Docker strapiDB). Ne conserve que le schéma "public" (= Strapi) ;
# toute la plomberie Supabase du dump (auth/storage/vault/graphql/realtime) est
# ignorée car Strapi ne s'en sert pas.
#
# Prérequis : `make strapi-db-up` (conteneur strapiDB démarré sur le port 5433).
# Usage      : bash scripts/restore-cluster-dump.sh <chemin/vers/db_cluster-....backup.gz>
#
# ⚠ Destructif : remplace le contenu du schéma public de la base "strapi".
#
set -euo pipefail

BACKUP="${1:?Usage: restore-cluster-dump.sh <dump.gz>}"
PORT="${STRAPI_DB_PORT:-5433}"
export PGPASSWORD="${STRAPI_DB_PASSWORD:-strapi_password}"
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U strapi)

[ -f "$BACKUP" ] || { echo "❌ Backup introuvable : $BACKUP" >&2; exit 1; }
docker exec strapiDB pg_isready -U strapi -d strapi >/dev/null 2>&1 \
  || { echo "❌ Conteneur strapiDB non prêt — lance 'make strapi-db-up'" >&2; exit 1; }

TMP="$(mktemp -t rec_cluster_XXXX).sql"
trap 'rm -f "$TMP" "$TMP.public"' EXIT

echo "→ Décompression + chargement du dump cluster dans la base 'postgres' (erreurs Supabase ignorées)…"
gzip -dc "$BACKUP" > "$TMP"
"${PSQL[@]}" -d postgres -v ON_ERROR_STOP=0 -q -f "$TMP" >/dev/null 2>&1 || true

echo "→ Extraction du schéma public (pg_dump v15 depuis le conteneur)…"
docker exec strapiDB pg_dump -U strapi -d postgres -n public --no-owner --no-acl > "$TMP.public"

echo "→ Rechargement propre dans la base 'strapi'…"
"${PSQL[@]}" -d strapi -q -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto;'
"${PSQL[@]}" -d strapi -v ON_ERROR_STOP=0 -q -f "$TMP.public" >/dev/null 2>&1 || true

echo "✓ Restauré. Articles en base : $("${PSQL[@]}" -d strapi -tAc 'SELECT count(*) FROM articles;' 2>/dev/null || echo '?')"
