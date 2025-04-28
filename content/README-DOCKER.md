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

## Production Environment

For production deployments, we use a multi-stage Docker build to create an optimized container.

### Starting Strapi in Production Mode

```bash
# From the project root directory
make strapi-prod-init

# Or manually
make strapi-setup
make strapi-prod-build
make strapi-prod-up
```

### Viewing Production Logs

```bash
make strapi-prod-logs
```

### Stopping Production Containers

```bash
make strapi-prod-down
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

- `docker-compose.yml` - Development environment
- `docker-compose.prod.yml` - Production environment

## Dockerfile

- `Dockerfile` - Development Dockerfile
- `Dockerfile.prod` - Production Dockerfile with multi-stage build

## Ports

- Strapi: `1337`
- PostgreSQL: `5432`

## Volumes

- `strapi-data` - Persistent PostgreSQL database data 