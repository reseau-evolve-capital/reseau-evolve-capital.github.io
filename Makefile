.PHONY: dev dev-web dev-vitrine build lint typecheck test test-e2e storybook \
        db-start db-stop db-migrate db-reset db-types db-set-sheet db-sync \
        docker-build docker-up docker-down \
        vitrine-export vitrine-deploy strapi-dev strapi-env strapi-build strapi-up strapi-down strapi-logs strapi-restart strapi-admin strapi-init strapi-clean \
        strapi-db-up strapi-db-down strapi-db-shell strapi-db-restore \
        strapi-prod-build strapi-prod-up strapi-prod-down strapi-prod-logs strapi-prod-restart \
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

## Docker (apps/web uniquement)
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

## Vitrine — Strapi (blog) & deploy GitHub Pages (LOCAL, Strapi doit tourner)
VITRINE_DIR         = apps/vitrine
STRAPI_DIR          = apps/vitrine/content
STRAPI_COMPOSE      = cd $(STRAPI_DIR) && docker compose
STRAPI_COMPOSE_PROD = cd $(STRAPI_DIR) && docker compose -f docker-compose.prod.yml

# Build + export statique (out/, .nojekyll, CNAME) — Strapi DOIT tourner sinon blog vide
vitrine-export:
	pnpm --filter @evolve/vitrine build
	touch $(VITRINE_DIR)/out/.nojekyll
	echo "reseauevolvecapital.com" > $(VITRINE_DIR)/out/CNAME

# Publier out/ sur la branche gh-pages (gh-pages -d out -t)
vitrine-deploy: vitrine-export
	pnpm --filter @evolve/vitrine deploy

# Strapi en dev natif — content/ est en YARN. Exige Node 22 LTS (engines <=22.x) :
# bascule auto via nvm (lit content/.nvmrc=22). Node 23/24 = refusé par yarn.
strapi-dev:
	cd $(STRAPI_DIR) && bash -c '. "$${NVM_DIR:-$$HOME/.nvm}/nvm.sh"; nvm use && yarn develop'

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

## Strapi prod (serveur distant — FUTUR ; compose.prod relance un postgres local → réconcilier avec Supabase)
strapi-prod-build:
	$(STRAPI_COMPOSE_PROD) build

strapi-prod-up:
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
