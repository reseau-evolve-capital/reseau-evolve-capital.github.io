# Variables
DOCKER_COMPOSE = docker-compose
APP_NAME = reseauevolvecapital-gh-pages

.PHONY: help build up down restart logs clean install dev deploy-gh

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
#	echo "reseauevolvecapital.com" > out/CNAME

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