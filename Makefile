.PHONY: dev dev-web dev-vitrine build lint typecheck test test-e2e storybook \
        db-start db-stop db-migrate db-reset db-types db-set-sheet db-sync db-set-sheet-prod db-sync-prod \
        supabase-deploy-prod supabase-check-prod-auth \
        docker-build docker-up docker-down \
        vitrine-export vitrine-deploy strapi-dev strapi-seed strapi-env strapi-build strapi-up strapi-down strapi-logs strapi-restart strapi-admin strapi-init strapi-clean \
        strapi-db-up strapi-db-down strapi-db-shell strapi-db-restore \
        strapi-prod-pull strapi-prod-up strapi-prod-down strapi-prod-logs strapi-prod-restart \
        clean help

## Day-to-day
dev:
	pnpm turbo dev

dev-web:
	pnpm --filter @evolve/web dev

dev-vitrine:
	pnpm --filter @evolve/vitrine dev

storybook:
	pnpm turbo storybook --filter=@evolve/ui

## Qualité (les trois avant de push)
build:
	pnpm turbo build

lint:
	pnpm turbo lint

typecheck:
	pnpm turbo typecheck

test:
	pnpm turbo test

test-e2e:
	pnpm --filter @evolve/web exec playwright test

## Supabase local (via CLI, PAS docker-compose)
db-start:
	supabase start

db-stop:
	supabase stop

db-migrate:
	supabase db push

db-reset:
	@echo "⚠️  DESTRUCTIF — wipe DB locale"
	supabase db reset

db-types:
	supabase gen types typescript --local > packages/data/src/supabase/types.gen.ts

db-set-sheet:
	node scripts/set-sheet-id.mjs $(CLUB_ID)

db-sync:
	node scripts/sync-sheets.mjs $(CLUB_ID)

# Variantes PROD : pointent les scripts sur le projet distant via apps/web/.env.prod
# (gitignored : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY prod). SHEET_ID
# vient de .env.prod ou supabase/functions/.env. Usage : make db-set-sheet-prod CLUB_ID=<uuid>
db-set-sheet-prod:
	set -a; . ./apps/web/.env.prod; set +a; node scripts/set-sheet-id.mjs $(CLUB_ID)

db-sync-prod:
	set -a; . ./apps/web/.env.prod; set +a; node scripts/sync-sheets.mjs $(CLUB_ID)

# Déploiement PROD après un merge sur main (migrations + edge functions). Garde-fou
# CONFIRM=yes obligatoire. NE touche PAS la config auth ni les secrets (cf. runbook).
# Runbook complet : docs/deploy/SUPABASE_PROD.md
supabase-deploy-prod:
ifneq ($(CONFIRM),yes)
	@echo "⚠️  Déploiement Supabase PROD — relance avec CONFIRM=yes pour confirmer :"
	@echo "      make supabase-deploy-prod CONFIRM=yes"
	@echo ""
	@echo "   Ce que ça fait : pousse les MIGRATIONS puis déploie les EDGE FUNCTIONS"
	@echo "   sur le projet Supabase LIÉ (verify_jwt vient de supabase/config.toml)."
	@echo "   Prérequis : supabase link --project-ref kiwcjtilwihioswdsjjv (+ mot de passe DB)."
	@echo "   NE touche PAS la config auth (otp_length, hook send_email) ni les secrets —"
	@echo "   ces étapes restent manuelles (dashboard / supabase secrets set). Cf. docs/deploy/SUPABASE_PROD.md"
	@exit 1
else
	@echo "▶ db push (migrations) sur le projet lié…"
	supabase db push
	@echo "▶ functions deploy --use-api (toutes les fonctions ; verify_jwt vient de config.toml)…"
	supabase functions deploy --use-api
	@echo ""
	@echo "✅ Migrations + Edge Functions déployées."
	@echo "⚠️  NON automatisé (à faire à la main — cf. docs/deploy/SUPABASE_PROD.md) :"
	@echo "   • Secrets : supabase secrets set …  (SEND_EMAIL_HOOK_SECRET, BREVO_*, clés feedback IA/Discord/GitHub/Notion)"
	@echo "   • Config auth (dashboard) : mailer_otp_length=6, rate_limit_email_sent=5"
	@echo "   • Activation du hook send_email (dashboard — JAMAIS via config push, sinon hook désactivé)"
	@echo "   → vérifie la config auth : make supabase-check-prod-auth"
endif

# Garde anti-dérive de la config auth prod (otp_length / rate limit) via Management API.
supabase-check-prod-auth:
	@echo "▶ Vérif config auth prod (exporte d'abord SUPABASE_ACCESS_TOKEN=sbp_…)"
	node scripts/supabase-prod-auth-check.mjs

## Docker (apps/web uniquement)
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

## Vitrine — Strapi (blog) & deploy GitHub Pages (LOCAL, Strapi doit tourner)
# Strapi (CMS) extrait dans apps/cms (app autonome, déployable seule — cf. EDI-000).
VITRINE_DIR         = apps/vitrine
STRAPI_DIR          = apps/cms
STRAPI_COMPOSE      = cd $(STRAPI_DIR) && docker compose
STRAPI_COMPOSE_PROD = cd $(STRAPI_DIR) && docker compose -p strapi -f docker-compose.production.yml

# Build + export statique (out/, .nojekyll, CNAME) — Strapi DOIT tourner sinon blog vide
vitrine-export:
	pnpm --filter @evolve/vitrine build
	touch $(VITRINE_DIR)/out/.nojekyll
	echo "reseauevolvecapital.com" > $(VITRINE_DIR)/out/CNAME

# Publier out/ sur la branche gh-pages (gh-pages -d out -t)
# NB: 'run' obligatoire — 'deploy' est une commande pnpm reservee, sinon pnpm l'intercepte.
# Garde-fou RT-07 : check-og-images crawle out/ et exit 1 si un article a une
# og:image hors budget WhatsApp (>300 KB / dimensions/type KO) → bloque la publication.
vitrine-deploy: vitrine-export
	node apps/vitrine/scripts/check-og-images.mjs
	pnpm --filter @evolve/vitrine run deploy

# Strapi en dev natif — apps/cms est en YARN. Exige Node 22 LTS (engines <=22.x) :
# bascule auto via nvm (lit apps/cms/.nvmrc=22). Node 23/24 = refusé par yarn.
strapi-dev:
	cd $(STRAPI_DIR) && bash -c '. "$${NVM_DIR:-$$HOME/.nvm}/nvm.sh"; nvm use && yarn develop'

# Seed idempotent de l'édition 01 « La Quote-Part » (EDI-002) : démarre Strapi dev
# avec le flag SEED_EDITION_01=1 (le bootstrap crée l'article brouillon s'il manque).
strapi-seed:
	cd $(STRAPI_DIR) && bash -c '. "$${NVM_DIR:-$$HOME/.nvm}/nvm.sh"; nvm use && SEED_EDITION_01=1 yarn develop'

# Copie .env.docker → .env UNIQUEMENT s'il n'existe pas (ne clobbe jamais le .env Supabase)
strapi-env:
	@test -f $(STRAPI_DIR)/.env && echo "✋ $(STRAPI_DIR)/.env existe déjà — non écrasé" || cp $(STRAPI_DIR)/.env.docker $(STRAPI_DIR)/.env

strapi-build:
	$(STRAPI_COMPOSE) build

strapi-up:
	$(STRAPI_COMPOSE) up -d

strapi-down:
	$(STRAPI_COMPOSE) down

strapi-logs:
	$(STRAPI_COMPOSE) logs -f

strapi-restart: strapi-down strapi-up

# make strapi-admin USER=... PASS=... FIRSTNAME=... LASTNAME=...
strapi-admin:
	$(STRAPI_COMPOSE) exec strapi npm run strapi admin:create -- --email $(USER) --password $(PASS) --firstname $(FIRSTNAME) --lastname $(LASTNAME)

strapi-init: strapi-build strapi-up

strapi-clean:
	$(STRAPI_COMPOSE) down -v --rmi all

## Strapi DB locale (Postgres Docker isolé :5433 — l'ancien Supabase distant est mort)
strapi-db-up:
	$(STRAPI_COMPOSE) up -d strapiDB

strapi-db-down:
	$(STRAPI_COMPOSE) stop strapiDB

strapi-db-shell:
	docker exec -it strapiDB psql -U strapi -d strapi

# Restaure un dump cluster Supabase (.gz) dans la base strapi locale (schéma public uniquement).
# make strapi-db-restore BACKUP=db_cluster-....backup.gz
strapi-db-restore:
	cd $(STRAPI_DIR) && bash scripts/restore-cluster-dump.sh "$(abspath $(BACKUP))"

## Strapi prod (droplet DigitalOcean derrière Traefik — image GHCR pré-buildée en CI).
## ⚠ À exécuter SUR LE DROPLET (exige .env, réseau `web` Traefik, login GHCR si image privée).
## L'image n'est PAS buildée ici → `strapi-prod-pull` tire la dernière depuis GHCR.
## Cf. docs/infra/RUNBOOK-cms-digitalocean.md
strapi-prod-pull:
	$(STRAPI_COMPOSE_PROD) pull

strapi-prod-up: strapi-prod-pull
	$(STRAPI_COMPOSE_PROD) up -d

strapi-prod-down:
	$(STRAPI_COMPOSE_PROD) down

strapi-prod-logs:
	$(STRAPI_COMPOSE_PROD) logs -f

strapi-prod-restart: strapi-prod-down strapi-prod-up

## Nettoyage
clean:
	pnpm turbo clean && rm -rf node_modules .turbo

help:
	@grep -E '^## ' Makefile | sed 's/^## //'
