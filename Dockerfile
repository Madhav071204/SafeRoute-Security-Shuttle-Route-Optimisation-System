# syntax=docker/dockerfile:1

# ==============================================================================
# SafeRoute — production Dockerfile (multi-stage)
# ==============================================================================
# Stage 1 (base):    Shared Node.js Alpine image for all stages
# Stage 2 (deps):    Install npm dependencies from the lockfile
# Stage 3 (builder): Compile the Next.js production build
# Stage 4 (runner):  Minimal runtime image — only what is needed to serve the app
# ==============================================================================

# --- Stage 1: base -----------------------------------------------------------
# Alpine keeps images small. Node 20 matches the LTS version used in CI.
FROM node:20-alpine AS base

# --- Stage 2: deps -----------------------------------------------------------
# Install dependencies in an isolated layer so Docker can cache them when only
# application source code changes (not package.json / package-lock.json).
FROM base AS deps

# libc6-compat helps some native npm packages work on Alpine/musl.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only manifest files first — maximises layer-cache hits on rebuilds.
COPY package.json package-lock.json ./

# npm ci installs exact versions from the lockfile (reproducible builds).
RUN npm ci

# --- Stage 3: builder ------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public/ exists so the runner stage can always copy it (this project
# may not ship static assets yet, but Next.js expects the directory).
RUN mkdir -p public

# NEXT_PUBLIC_* variables are embedded into the client bundle at build time.
# Pass them as build arguments — never hardcode secrets in the Dockerfile.
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Disable Next.js anonymous telemetry in CI and container builds.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Stage 4: runner ---------------------------------------------------------
# Final image: no compiler, no devDependencies, no full node_modules tree.
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user — limits damage if the container is compromised.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

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

# Verify the HTTP server responds without installing curl/wget in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
