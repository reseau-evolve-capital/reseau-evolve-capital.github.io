#!/usr/bin/env bash
#
# Déploiement de Strapi sur le droplet DigitalOcean : pull de l'image GHCR pré-buildée
# en CI + (re)démarrage du projet compose `strapi`. NE CONSTRUIT RIEN ici.
#
# À exécuter SUR LE DROPLET, depuis le dossier qui contient docker-compose.production.yml
# et .env (ex. /opt/strapi). Le script se déplace dans son propre dossier.
#
# Cf. docs/infra/RUNBOOK-cms-digitalocean.md
set -euo pipefail

PROJECT=strapi
COMPOSE_FILE=docker-compose.production.yml
COMPOSE="docker compose -p ${PROJECT} -f ${COMPOSE_FILE}"

# Se placer là où vit le compose (ex. /opt/strapi).
cd "$(dirname "$0")"

# 1. Le réseau externe `web` (créé par le projet Traefik) doit exister.
if ! docker network inspect web >/dev/null 2>&1; then
  echo "❌ Réseau Docker 'web' introuvable. Démarrer d'abord Traefik (/opt/proxy)." >&2
  exit 1
fi

# 2. Traefik doit tourner (sinon ni TLS ni routage).
if ! docker ps --format '{{.Names}}' | grep -qi traefik; then
  echo "⚠ Conteneur Traefik non détecté — vérifier le projet /opt/proxy avant de continuer." >&2
fi

# 3. .env requis (jamais commité).
if [ ! -f .env ]; then
  echo "❌ .env manquant dans $(pwd). Copier .env.production.example → .env et le remplir." >&2
  exit 1
fi

# 4. Tirer la dernière image + (re)démarrer.
echo "→ Pull de l'image GHCR…"
$COMPOSE pull
echo "→ Démarrage / mise à jour…"
$COMPOSE up -d
echo "→ État des services :"
$COMPOSE ps
echo "✅ Déploiement terminé. Suivre les logs : ${COMPOSE} logs -f strapi"
