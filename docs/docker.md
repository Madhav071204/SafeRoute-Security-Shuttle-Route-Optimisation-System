# Docker Guide for SafeRoute

This guide explains how SafeRoute runs in Docker. It is written for developers who are new to containers.

---

## What is Docker?

**Docker** packages an application and everything it needs to run (Node.js, dependencies, built files) into a single, portable unit called an **image**.

Think of an image like a **recipe + pre-made ingredients kit**: anyone with Docker can follow the same recipe and get the same result on Windows, macOS, or Linux.

---

## What is Docker Compose?

**Docker Compose** is a tool for defining and running multi-container setups from one YAML file.

For SafeRoute we only need **one** container today, but Compose still helps because it:

- Builds the image with the right arguments
- Maps port `3000` on your machine to port `3000 in the container
- Loads environment variables from your `.env` / `.env.local` files
- Lets you start everything with a single command: `docker compose up`

---

## What was created

| File | Purpose |
|------|---------|
| `Dockerfile` | Instructions to build the production image (multi-stage) |
| `.dockerignore` | Tells Docker which files to skip when copying into the image |
| `docker-compose.yml` | One-command local setup: build + run + ports + env |
| `next.config.js` | Updated with `output: 'standalone'` for a minimal production server |

---

## How the Dockerfile works (every instruction)

### Stage 1 — `base`

```dockerfile
FROM node:20-alpine AS base
```

- **`FROM`**: Start from an official Node.js 20 image on Alpine Linux (small footprint).
- **`AS base`**: Names this stage so later stages can reuse it.

### Stage 2 — `deps`

```dockerfile
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
```

| Instruction | Why it exists |
|-------------|---------------|
| `RUN apk add libc6-compat` | Some npm packages expect glibc; this improves compatibility on Alpine. |
| `WORKDIR /app` | Sets the working directory inside the container. |
| `COPY package.json package-lock.json` | Copy only manifests first so Docker caches dependency installs. |
| `RUN npm ci` | Clean, reproducible install from the lockfile (same as CI). |

### Stage 3 — `builder`

```dockerfile
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
```

| Instruction | Why it exists |
|-------------|---------------|
| `COPY --from=deps` | Reuse installed `node_modules` from the deps stage. |
| `COPY . .` | Copy application source (respecting `.dockerignore`). |
| `RUN mkdir -p public` | Ensures `public/` exists for the final copy step. |
| `ARG` / `ENV NEXT_PUBLIC_MAPBOX_TOKEN` | Next.js inlines `NEXT_PUBLIC_*` vars at **build time** into the browser bundle. |
| `NEXT_TELEMETRY_DISABLED=1` | Turns off anonymous Next.js telemetry in containers. |
| `RUN npm run build` | Produces the optimized production build and `.next/standalone` output. |

### Stage 4 — `runner`

```dockerfile
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup ... && adduser ...
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
HEALTHCHECK ...
CMD ["node", "server.js"]
```

| Instruction | Why it exists |
|-------------|---------------|
| `ENV NODE_ENV=production` | Runs Next.js in production mode. |
| `addgroup` / `adduser` | Creates a non-root user for security. |
| `COPY --from=builder` | Only copies the minimal standalone server — not source code or devDependencies. |
| `--chown=nextjs:nodejs` | Files are owned by the non-root user. |
| `USER nextjs` | Process runs as non-root. |
| `EXPOSE 3000` | Documents the port (does not publish it by itself). |
| `HOSTNAME=0.0.0.0` | Listen on all interfaces so port mapping works. |
| `HEALTHCHECK` | Docker can mark the container unhealthy if the app stops responding. |
| `CMD ["node", "server.js"]` | Starts the standalone Next.js server. |

---

## Prerequisites

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
2. A Mapbox public token — see `.env.example`

---

## Environment variables

| Variable | Required | When it is used |
|----------|----------|-----------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | **Build time** (browser bundle) and **runtime** (API routes) |

### Important: build-time vs runtime

Variables prefixed with `NEXT_PUBLIC_` are **embedded into JavaScript during `npm run build`**. If you change the token in `.env.local`, you must **rebuild** the image:

```bash
docker compose up --build
```

### Files Docker Compose reads

| File | Used for |
|------|----------|
| `.env` | Variable substitution in `docker-compose.yml` (e.g. `${NEXT_PUBLIC_MAPBOX_TOKEN}`) |
| `.env.local` | Runtime environment inside the container (`env_file` in compose) |

**Recommended setup:**

```bash
cp .env.example .env.local
# Edit .env.local and add your Mapbox token

# Compose also needs the token for build args — either copy to .env:
cp .env.local .env
# or export in your shell before building
```

Never commit `.env` or `.env.local` to git.

---

## How to build the image

From the project root:

```bash
docker build \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here \
  -t saferoute:latest .
```

**What this does:**

- `docker build` — reads the `Dockerfile` and creates an image layer by layer
- `--build-arg` — passes the Mapbox token into the builder stage (not stored in the final image layers if you avoid logging it)
- `-t saferoute:latest` — tags the image with a human-readable name
- `.` — build context is the current directory

---

## How to run the container

```bash
docker run -d \
  --name saferoute-app \
  -p 3000:3000 \
  -e NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here \
  saferoute:latest
```

**What this does:**

- `docker run` — creates and starts a container from an image
- `-d` — detached mode (runs in the background)
- `--name saferoute-app` — friendly name for logs/stop commands
- `-p 3000:3000` — maps `localhost:3000` on your machine to port 3000 in the container
- `-e` — sets a runtime environment variable
- `saferoute:latest` — the image to run

Open **http://localhost:3000** in your browser.

---

## How to view logs

```bash
docker logs saferoute-app
```

Follow logs in real time:

```bash
docker logs -f saferoute-app
```

With Docker Compose:

```bash
docker compose logs -f
```

---

## How to stop the container

```bash
docker stop saferoute-app
```

This sends a graceful shutdown signal. The container still exists until you remove it.

---

## How to remove the container

```bash
docker rm saferoute-app
```

Remove a running container forcefully:

```bash
docker rm -f saferoute-app
```

---

## How to rebuild after code changes

After editing source code **or** changing `NEXT_PUBLIC_*` variables:

```bash
docker build --no-cache \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here \
  -t saferoute:latest .
```

Then stop/remove the old container and run again.

`--no-cache` forces a full rebuild (useful when debugging; slower than a cached rebuild).

---

## Running with Docker Compose

```bash
docker compose up --build
```

**What this does:**

- Reads `docker-compose.yml`
- Builds the image (passing build args from `.env` / your shell)
- Starts the `app` service
- Publishes port 3000

Run in the background:

```bash
docker compose up --build -d
```

---

## Stopping Docker Compose

```bash
docker compose down
```

**What this does:**

- Stops all services defined in the compose file
- Removes containers and the default network
- Does **not** delete the built image (use `docker rmi saferoute:latest` to remove the image)

---

## Common Docker commands

| Command | What it does |
|---------|--------------|
| `docker images` | List images on your machine |
| `docker ps` | List running containers |
| `docker ps -a` | List all containers (including stopped) |
| `docker inspect saferoute-app` | Detailed container metadata (ports, env, health) |
| `docker exec -it saferoute-app sh` | Open a shell inside a running container |
| `docker system df` | Show disk usage by images/containers |
| `docker system prune` | Remove unused containers, networks, and dangling images |

---

## Troubleshooting

### Maps do not load / "Mapbox token not configured"

1. Confirm `NEXT_PUBLIC_MAPBOX_TOKEN` is set and not the placeholder from `.env.example`
2. **Rebuild** the image — client-side code needs the token at build time
3. Check runtime env: `docker exec saferoute-app printenv NEXT_PUBLIC_MAPBOX_TOKEN`

### Port 3000 already in use

Stop the local dev server (`npm run dev`) or change the host port:

```yaml
ports:
  - "3001:3000"
```

Then open http://localhost:3001

### Build fails at `npm ci`

- Ensure `package-lock.json` is committed and in sync with `package.json`
- Run `npm ci` locally to verify

### Container exits immediately

```bash
docker logs saferoute-app
```

Common causes: build failed silently, missing `server.js` (standalone output not enabled), or port binding error.

### Health check shows "unhealthy"

Wait for `start_period` (15s) on first boot. If it persists:

```bash
docker inspect --format='{{json .State.Health}}' saferoute-app
```

### Changes to code not reflected

You are running a **production** image, not `npm run dev`. Rebuild after every code change:

```bash
docker compose up --build
```

For hot-reload development, continue using `npm run dev` outside Docker.

### CI still passes?

GitHub Actions runs `npm run build` directly — it does not use Docker. The `output: 'standalone'` setting adds extra files under `.next/standalone` but does not break the normal build.

---

## Architecture diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Your machine (host)                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Docker container: saferoute-app                    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  node server.js  (Next.js standalone)           │  │  │
│  │  │  Port 3000, user: nextjs (non-root)             │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│         ▲                                                    │
│         │  localhost:3000  (docker -p 3000:3000)            │
└─────────┴────────────────────────────────────────────────────┘
```

---

## Further reading

- [Next.js Docker deployment docs](https://nextjs.org/docs/app/building-your-application/deploying#docker-image)
- [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/)
- [Docker Compose file reference](https://docs.docker.com/compose/compose-file/)
