# syntax=docker/dockerfile:1

# ==============================================================================
# SafeRoute — production Dockerfile (multi-stage, Node 22)
# ==============================================================================
# Stage 1 (base):    Shared Node.js image for all stages
# Stage 2 (deps):    Install npm dependencies from the lockfile
# Stage 3 (builder): Compile the Next.js production standalone build
# Stage 4 (runner):  Minimal runtime image — only what is needed to serve the app
# ==============================================================================

# --- Stage 1: base -----------------------------------------------------------
# Node 22 matches the verified local environment and active CI target.
# Pin to the Node 22 slim line (not an unqualified `latest`).
FROM node:22-slim AS base

# --- Stage 2: deps -----------------------------------------------------------
# Install dependencies in an isolated layer so Docker can cache them when only
# application source code changes (not package.json / package-lock.json).
FROM base AS deps

WORKDIR /app

# Copy only manifest files first — maximises layer-cache hits on rebuilds.
COPY package.json package-lock.json ./

# npm ci installs exact versions from the lockfile (reproducible builds).
# TLS verification remains enabled (no strict-ssl=false, no insecure bypass).
RUN npm ci

# --- Stage 3: builder ------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public/ exists so the runner stage can always copy it.
RUN mkdir -p public

# NEXT_PUBLIC_* variables are embedded into the client bundle at build time.
# Pass them as build arguments — never hardcode secrets in the Dockerfile.
# Prefer a URL-restricted public token for browser Mapbox GL only.
ARG NEXT_PUBLIC_MAPBOX_TOKEN=""
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Disable Next.js anonymous telemetry in CI and container builds.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# TLS verification stays enabled during the build (including font download).
# For corporate interception CAs, pass NODE_EXTRA_CA_CERTS at build time via a
# mounted/approved CA file — never disable certificate verification.
RUN npm run build

# --- Stage 4: runner ---------------------------------------------------------
# Final image: no compiler, no package manager install, no full node_modules.
FROM base AS runner

WORKDIR /app

ARG GIT_REVISION=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="SafeRoute" \
      org.opencontainers.image.description="Security shuttle route optimisation system" \
      org.opencontainers.image.source="https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.revision="${GIT_REVISION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Patch OS packages in the runtime image (Debian slim base CVEs from ECR scan).
USER root
RUN apt-get update \
  && apt-get upgrade -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Run as a non-root user — limits damage if the container is compromised.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone output includes server.js and traced production dependencies only.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Next.js listens on 3000 by default; expose documents the intended port.
EXPOSE 3000

ENV PORT=3000
# Bind to all interfaces so traffic from outside the container reaches the app.
ENV HOSTNAME=0.0.0.0

# Lightweight liveness probe against /api/health (no curl in the image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => { let d=''; r.on('data', c => d+=c); r.on('end', () => process.exit(r.statusCode===200 ? 0 : 1)); }).on('error', () => process.exit(1))"

# PID 1 is the Node process so SIGTERM stops the container cleanly.
CMD ["node", "server.js"]
