# Cubicle Survivor

A 2D survival game built with [Phaser 3](https://phaser.io/) + TypeScript, with an online
leaderboard. This project is also a hands-on playground for **Docker** and **Azure Static
Web Apps (SWA)**.

## Project structure

```
game/   Phaser 3 + TypeScript game, built with Vite. Deployed as a static site to Azure SWA.
api/    Node + Express + TypeScript leaderboard API, backed by Azure Table Storage.
        Deployed to Azure Container Apps.
.devcontainer/  VS Code dev container definition (Node + Docker + Azure CLI).
docker-compose.yml  Runs the full stack locally: game, api, and an Azurite storage emulator.
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for the containerized workflow)
- An Azure subscription (for deployment)

## Running locally (no Docker)

```powershell
# Terminal 1 - game
cd game
npm install
npm run dev       # http://localhost:5173

# Terminal 2 - api
cd api
npm install
npm run dev        # http://localhost:3000
```

The API needs an `AZURE_STORAGE_CONNECTION_STRING` environment variable. For local
development without a real Azure resource, run Azurite (see below) or use the
docker-compose workflow, which wires this up automatically.

## Running locally (Docker Compose)

```powershell
docker compose up --build
```

This starts three containers:

- `azurite` - local Azure Table Storage emulator
- `api` - the leaderboard API, connected to `azurite`, on http://localhost:3000
- `game` - the Vite dev server, connected to `api`, on http://localhost:5173

## Deployment

- `game/` is deployed to **Azure Static Web Apps** via `.github/workflows/swa-deploy.yml`.
- `api/` is built into a Docker image, pushed to Docker Hub, and deployed to **Azure
  Container Apps** via `.github/workflows/api-container-deploy.yml`.

See the phase notes in this repo's history for the full setup steps (resource
provisioning, secrets, environment variables).

## Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| `game/` | `npm run dev` | Start the Vite dev server |
| `game/` | `npm run build` | Type-check and build for production |
| `game/` | `npm run test` | Run Vitest unit tests |
| `api/` | `npm run dev` | Start the API with hot reload (`tsx watch`) |
| `api/` | `npm run build` | Compile TypeScript to `dist/` |
| `api/` | `npm run test` | Run Vitest/Supertest API tests |
