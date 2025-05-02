# Variables
DOCKER_COMPOSE = docker-compose
APP_NAME = reseauevolvecapital-gh-pages
STRAPI_DIR = content
STRAPI_DOCKER_COMPOSE = cd $(STRAPI_DIR) && docker-compose
STRAPI_DOCKER_COMPOSE_PROD = cd $(STRAPI_DIR) && docker-compose -f docker-compose.prod.yml
USER = lionel@omniventus.com
PASS = M@ster01!
FIRSTNAME = Lionel
LASTNAME = ZOCLANCLOUNON

.PHONY: help build up down restart logs clean install dev deploy-gh strapi-build strapi-up strapi-down strapi-logs strapi-admin strapi-dev strapi-prod strapi-db-migrate strapi-prod-build strapi-prod-up strapi-prod-down strapi-prod-logs strapi-prod-restart strapi-prod-init

help: ## Show this help menu
	@echo "Usage: make [TARGET ...]"
	@echo ""
	@echo "Targets:"
	@awk '/^[a-zA-Z\-\_0-9]+:/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
		if (helpMessage) { \
			helpCommand = substr($$1, 0, index($$1, ":")-1); \
			helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
			printf "  %-20s %s\n", helpCommand, helpMessage; \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)

## Docker commands
build: ## Build or rebuild services
	$(DOCKER_COMPOSE) build

up: ## Create and start containers
	$(DOCKER_COMPOSE) up

down: ## Stop and remove containers
	$(DOCKER_COMPOSE) down

restart: down up ## Restart all containers

logs: ## View output from containers
	$(DOCKER_COMPOSE) logs -f

clean: ## Remove containers, volumes, and images
	$(DOCKER_COMPOSE) down -v --rmi all

## Development commands
install: ## Install dependencies
	npm install

dev: ## Run development server without Docker
	npm run dev

## Production commands
build-prod: ## Build for production
	npm run build

## Static export commands
export-static: ## Export static files to out directory
	rm -rf out
	npm run build
	touch out/.nojekyll
	echo "reseauevolvecapital.com" > out/CNAME

## GitHub Pages deployment
deploy-gh: export-static ## Deploy to GitHub Pages
	npm run deploy

## Docker development shortcuts
docker-dev: build ## Build and start development environment with static server
	$(DOCKER_COMPOSE) up 

## Local static preview
serve-static: export-static ## Serve static files locally
	npx serve out -p 3000

## Utility commands
lint: ## Run linter
	npm run lint

purge: ## Clean node_modules, build files and Docker artifacts
	rm -rf node_modules
	rm -rf .next
	rm -rf out
	$(MAKE) clean 

## Strapi commands
strapi-setup: ## Copy Docker environment file
	cp $(STRAPI_DIR)/.env.docker $(STRAPI_DIR)/.env

strapi-build: ## Build Strapi Docker containers
	$(STRAPI_DOCKER_COMPOSE) build

strapi-up: ## Start Strapi containers
	$(STRAPI_DOCKER_COMPOSE) up -d

strapi-down: ## Stop Strapi containers
	$(STRAPI_DOCKER_COMPOSE) down

strapi-logs: ## View Strapi container logs
	$(STRAPI_DOCKER_COMPOSE) logs -f

strapi-admin: ## Create a new admin user (Use: make strapi-admin USER=user@example.com PASS=password FIRSTNAME=Name LASTNAME=Lastname)
	$(STRAPI_DOCKER_COMPOSE) exec strapi npm run strapi admin:create -- --email $(USER) --password $(PASS) --firstname $(FIRSTNAME) --lastname $(LASTNAME)

strapi-dev: ## Start Strapi in development mode
	cd $(STRAPI_DIR) && npm run develop

strapi-prod: ## Start Strapi in production mode
	cd $(STRAPI_DIR) && npm run start

strapi-db-backup: ## Backup Strapi database
	$(STRAPI_DOCKER_COMPOSE) exec strapiDB pg_dump -U strapi strapi > $(STRAPI_DIR)/database/dump_`date +%Y%m%d%H%M%S`.sql

strapi-db-restore: ## Restore Strapi database from a dump file (Use: make strapi-db-restore DUMP=path/to/dump.sql)
	$(STRAPI_DOCKER_COMPOSE) exec -T strapiDB psql -U strapi strapi < $(DUMP)

strapi-restart: strapi-down strapi-up ## Restart Strapi containers

strapi-clean: ## Remove Strapi containers, volumes, and images
	$(STRAPI_DOCKER_COMPOSE) down -v --rmi all

strapi-init: strapi-setup strapi-build strapi-up ## Setup and start Strapi with Docker in one command

## Strapi Production commands
strapi-prod-build: ## Build Strapi production Docker containers
	$(STRAPI_DOCKER_COMPOSE_PROD) build

strapi-prod-up: ## Start Strapi production containers
	$(STRAPI_DOCKER_COMPOSE_PROD) up -d

strapi-prod-down: ## Stop Strapi production containers
	$(STRAPI_DOCKER_COMPOSE_PROD) down

strapi-prod-logs: ## View Strapi production container logs
	$(STRAPI_DOCKER_COMPOSE_PROD) logs -f

strapi-prod-restart: strapi-prod-down strapi-prod-up ## Restart Strapi production containers

strapi-prod-init: strapi-setup strapi-prod-build strapi-prod-up ## Setup and start Strapi production with Docker in one command 