# Running Strapi with Docker

This guide explains how to run the Strapi application using Docker and Docker Compose.

## Prerequisites

- Docker installed on your machine
- Docker Compose installed on your machine

## Environment Setup

1. Create your environment file by copying the example:

```bash
cp .env.docker .env
```

2. (Optional) Edit the `.env` file to customize your settings

## Development Environment

### Starting Strapi in Development Mode

```bash
# From the project root directory
make strapi-init

# Or manually
make strapi-setup
make strapi-build
make strapi-up
```

This will:

1. Copy the Docker environment file
2. Build the Docker containers
3. Start the Strapi container and PostgreSQL database

### Viewing Logs

```bash
make strapi-logs
```

### Stopping the Containers

```bash
make strapi-down
```

### Creating an Admin User

```bash
make strapi-admin USER=admin@example.com PASS=your_password FIRSTNAME=Admin LASTNAME=User
```

## Production Environment (DigitalOcean + Traefik)

Production ne se build PAS localement : l'image est construite **en CI** (`Dockerfile.production`,
GitHub Actions → GHCR) puis **tirée par le droplet**. Le droplet ne fait que `pull` + `up`.

- Build/push image : `.github/workflows/deploy-cms.yml` (auto sur push `main`).
- Compose droplet : `docker-compose.production.yml` (projet `-p strapi`, Traefik, Postgres dédié).
- Déploiement : `./scripts/deploy-production.sh` sur le droplet, ou `make strapi-prod-up`
  (= pull + up, à lancer **sur le droplet**).
- **Runbook complet (DNS, secrets, migration contenu, TLS, smoke test, rollback) :**
  `docs/infra/RUNBOOK-cms-digitalocean.md`.

```bash
# Sur le droplet (depuis /opt/strapi) :
./deploy-production.sh
# ⚠ Ne JAMAIS faire `docker compose down -v` (supprime DB + médias).
```

## Database Management

### Backing Up the Database

```bash
make strapi-db-backup
```

This creates a SQL dump in the `database` directory with a timestamp.

### Restoring from a Backup

```bash
make strapi-db-restore DUMP=path/to/dump.sql
```

## Container Management

### Restarting Containers

```bash
# Development
make strapi-restart

# Production
make strapi-prod-restart
```

### Cleaning Up

To remove all containers, volumes, and images:

```bash
make strapi-clean
```

## Docker Compose Files

- `docker-compose.yml` - Development environment (local, projet `content`, Postgres :5433)
- `docker-compose.production.yml` - Production (droplet DO, projet `strapi`, Traefik + GHCR)

## Dockerfile

- `Dockerfile` - Development Dockerfile
- `Dockerfile.production` - Production multi-stage (node:22, yarn), buildé en CI → GHCR

## Ports

- Strapi: `1337` (en prod : exposé uniquement à Traefik via le réseau `web`, pas de port public)
- PostgreSQL (dev) : `5433` hôte ; (prod) : interne uniquement (réseau `internal`)

## Volumes

- Dev : `content_strapi-data` (Postgres)
- Prod : `strapi_strapi-db-data` (Postgres) + `strapi_strapi-uploads` (médias)
