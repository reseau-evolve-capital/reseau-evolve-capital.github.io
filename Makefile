.PHONY: dev dev-web dev-vitrine build lint typecheck test test-e2e storybook \
        db-start db-stop db-migrate db-reset db-types db-sync \
        docker-build docker-up docker-down \
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

db-sync:
	node scripts/sync-sheets.mjs $(CLUB_ID)

## Docker (apps/web uniquement)
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

## Nettoyage
clean:
	pnpm turbo clean && rm -rf node_modules .turbo

help:
	@grep -E '^## ' Makefile | sed 's/^## //'
