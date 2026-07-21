# SafeRoute Docker and Deployment Readiness

Phase 4 verification record for production container hardening, Node runtime
parity, TLS security, environment strategy, and local Docker evidence.
**No AWS resources were provisioned.**

## Verified repository state

Observed before Phase 4 implementation (2026-07-14):

| Item | Finding |
|------|---------|
| Working branch at start | `test/core-workflow-coverage` @ `6ca74f4` |
| Phase 4 work branch | `chore/deployment-hardening` created from `origin/fix/core-api-validation` @ `6bb1559` |
| PR #1 | **MERGED** into `chore/release-baseline` (merge commit `494253f`, title: Fix core API validation…) |
| PR #2 | **MERGED**, but base was `fix/core-api-validation` (merge commit `6bb1559`), **not** `chore/release-baseline` |
| `origin/chore/release-baseline` | Contains Phase 2B only (through PR #1). Phase 3 files (Vitest, Playwright, CI e2e job, testing docs) were **absent** until this PR lands |
| Phase 2B + Phase 3 content on Phase 4 tip | Present (API validation, route-source labelling, Vitest, Playwright, driver fixes, mobile nav, CI, testing docs) |

### Live GitHub Actions evidence (PR #2 / commit `6ca74f4`)

Workflow: **CI** — run [29299015560](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/runs/29299015560)

| Job | Conclusion | Notes |
|-----|------------|-------|
| Lint • Typecheck • Test • Build | **success** | `npm ci`, lint, typecheck, `npm test`, coverage (non-blocking), production build |
| Browser tests (Playwright) | **failure** | Chromium launched; 16 passed, 1 failed |

Playwright failure root cause: drawer overflow height asserted `> 0` on
`e2e/driver-regressions.spec.ts` — font/metrics differ between local Chrome and
CI Chromium, so overflow was `0` while the final stop remained reachable.
Fix applied in Phase 4: assert list visibility and final-stop reachability;
scroll only when overflow exists (does not weaken the reachability invariant).

Other CI observations from that run:

* Chromium was installed and used (`PLAYWRIGHT_CHANNEL=chromium`).
* No `.env.local` and no live Mapbox token were required.
* Failure artifacts uploaded (`playwright-report`, ~8.2 MB).
* Concurrency/cancellation behaved normally for a single PR run.
* Actions runners emitted Node 20 deprecation warnings for action runtimes;
  application Node version in YAML was still 20 at that time (aligned to 22 in
  Phase 4).

PR #1 had Copilot review success; the Phase 3-era `validate` path for PR #2 was
green. Merge into `chore/release-baseline` still required for a single green
baseline tip.

## Node runtime decision

**Supported production major version: Node 22.**

| Source | Before | After |
|--------|--------|-------|
| Local verification | Node `v22.17.1` | unchanged guidance |
| `package.json` engines | none | `>=22 <23` |
| `.nvmrc` / `.node-version` | absent | `22` |
| Dockerfile base | `node:20-slim` | `node:22-slim` |
| GitHub Actions | Node 20 | Node 22 |
| Container runtime evidence | — | `process.version` → `v22.23.1` |

Reasons: matches the verified local environment, supports the installed Next.js
line, avoids retaining EOL Node 20 in the active path, and reduces drift.
Node 24 was **not** adopted (untested migration risk; no requirement met).

## Docker architecture

Multi-stage standalone Next.js image:

1. **base** — `node:22-slim`
2. **deps** — `npm ci` from lockfile (TLS verification enabled)
3. **builder** — `npm run build` with optional `NEXT_PUBLIC_MAPBOX_TOKEN` build arg
4. **runner** — copy `public`, `.next/standalone`, `.next/static`; user `nextjs`
   (uid 1001); `CMD ["node","server.js"]`; healthcheck against `/api/health`

Already correct before Phase 4: standalone output, non-root user, `HOSTNAME=0.0.0.0`,
port 3000, multi-stage separation.

Changed for deployment readiness:

* Node 22 base
* Removed insecure TLS build path
* Healthcheck moved to `/api/health`
* OCI labels (`source`, `description`, `licenses`, `revision`, `created`)
* Stronger `.dockerignore` (tests, reports, docs, certs, env files)
* Compose defaults to secure TLS and image tag `saferoute:phase4`

## TLS security decision

Removed from the build/runtime path:

* `INSECURE_NPM_SSL` build arg
* `npm config set strict-ssl false`
* `NODE_TLS_REJECT_UNAUTHORIZED=0`
* Compose default `INSECURE_NPM_SSL=true`

TLS verification remains enabled. For corporate/university interception CAs,
the documented optional approach is `NODE_EXTRA_CA_CERTS` pointing at an
**approved CA file managed outside the repository** (mount/build secret). CA
material must not be committed or baked into image layers.

The Haversine route fallback remains for genuine Mapbox network failure; it is
not a substitute for disabling certificate verification.

## Environment-variable inventory

| Variable | Class | Build/Runtime | Required | Sensitive | Notes |
|----------|-------|---------------|----------|-----------|-------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public client (+ server fallback) | Build (client bundle) + optional runtime fallback | Yes for maps | Treat as **public** | Restrict origins/scopes in Mapbox dashboard |
| `MAPBOX_ACCESS_TOKEN` | Server-only | Runtime | Recommended in production | **Sensitive** | Preferred by `getMapboxToken()`; never `NEXT_PUBLIC_` |
| `NODE_ENV` | Server | Runtime | Set by image | No | `production` in Docker |
| `PORT` / `HOSTNAME` | Server | Runtime | Defaults in image | No | `3000` / `0.0.0.0` |
| `NEXT_TELEMETRY_DISABLED` | Server | Build/runtime | Set in image | No | |
| `NEXT_DISABLE_STANDALONE` | Build tooling | E2E/test builds only | Optional | No | Not used in Docker production build |
| `PLAYWRIGHT_*` | Test | Local/CI | Optional | No | Not shipped in image |
| `NODE_EXTRA_CA_CERTS` | Server/build | Optional | Optional | Path only | Secure CA bypass alternative |
| `GIT_REVISION` / `BUILD_DATE` | Image metadata | Build args | Optional | No | OCI labels |

Documented-but-unused placeholders previously listed for default origin/search
country remain unused by code and are omitted from `.env.example` to avoid
overstating configurability.

## Mapbox token strategy

Implemented separation:

* **Browser Mapbox GL** (`MapView`, `DriverMapView`, `TrackingMapView`, client
  search): `NEXT_PUBLIC_MAPBOX_TOKEN`
* **Server API routes** (`/api/route`, `/api/directions`, `/api/geocode-batch`
  via `getMapboxToken()`): prefer `MAPBOX_ACCESS_TOKEN`, fall back to
  `NEXT_PUBLIC_MAPBOX_TOKEN` only for local development

Guarantees:

* Server-only token is never given a `NEXT_PUBLIC_` prefix
* Tests use mocks / synthetic tokens (`pk.test-…`); no live Mapbox in CI
* Docker build may accept an empty public build arg; runtime server token is
  injected via Compose/ECS secrets, not baked permanently from `.env.local`
* API error JSON must not contain token values (existing regression tests cover this)

## Health-check design

`GET /api/health` → HTTP 200 `{ "status": "ok" }`

* No Mapbox calls, no external checks, no secrets/paths/versions
* Covered by `tests/api/health.test.ts`
* Docker `HEALTHCHECK` and Compose healthcheck use Node `http.get` (no `curl`
  package added to the runtime image)

## Docker build results

```text
docker build -t saferoute:phase4 …
→ success
Image size: 408MB
Runtime Node: v22.23.1
User: nextjs (uid 1001)
```

Major runner content: standalone server ~58MB + static assets ~3MB atop the
Node 22 slim base. No extreme minimisation pursued beyond excluding tests,
docs, git, and env files via `.dockerignore`.

## Container runtime results

| Check | Result |
|-------|--------|
| Container starts and stays running | Pass |
| `GET /` | HTTP 200 |
| `GET /api/health` | HTTP 200 `{"status":"ok"}` |
| Docker health status | `healthy` |
| Non-root process | uid 1001 (`nextjs`) |
| `.env.local` in image | Absent |
| `.git` in image | Absent |
| `test-results` / `coverage` / `e2e` / `tests` | Absent |
| `docker stop` exit | 143 (SIGTERM) — clean |
| Restart after stop | Becomes `healthy` again |
| `/api/optimize` (synthetic) | 200 ordered stops |
| `/api/route` without Mapbox | 200 Haversine fallback (`isFallback: true`) |
| Production logs | No tokens observed; no precise driver GPS dumps |

## Compose verification

| Command | Result |
|---------|--------|
| `docker compose config` | Exit 0 (loads optional `.env.local` when present) |
| `docker compose build` | Exit 0 → `saferoute:phase4` |
| `docker compose up -d` | Container `saferoute-app` **healthy** on `:3000` |
| Root + `/api/health` | 200 |
| `docker compose down` | Clean removal |

Compose uses the production image (no source-tree bind mount), no privileged
mode, secure TLS defaults, and runtime `MAPBOX_ACCESS_TOKEN` injection.

## Dependency-security findings

```text
npm audit --omit=dev
npm audit
```

| Finding | Severity | Path | Fix available? | Action |
|---------|----------|------|----------------|--------|
| PostCSS XSS via nested `postcss` under `next` | moderate | `next` → `postcss` | `npm audit fix --force` proposes **Next 9** (breaking, unsafe) | **Not applied.** No compatible non-breaking upgrade on Next 16.2.x clears it yet. Triaged as framework-nested; revisit when Next ships a patched line. |

No `npm audit fix --force`. No major framework upgrade solely for audit cosmetics.
**Commit 3 (deps) skipped.**

## Image-security findings

* Docker Scout CLI is installed but requires Docker Hub login — CVE scan **not
  executed** in this session.
* Trivy is **not** installed; not added as a permanent project dependency.
* Manual image inspection confirmed absence of `.env.local`, `.git`, and test
  artefacts; process runs as non-root.

Limitation: automated container CVE scanning remains a manual prerequisite
after authenticating Scout or running Trivy outside the repo.

## Known limitations

* `chore/release-baseline` on the remote still lacked Phase 3 until this PR
  merges Phase 3 + Phase 4 together.
* Live Phase 3 Playwright job was red until the drawer assertion fix lands.
* Public Mapbox token remains public by design; origin restrictions are an
  operator Mapbox-dashboard duty.
* Image size ~408MB is acceptable for portfolio deployment; further slim
  variants (distroless) were out of scope.
* Corporate CA support is documented only — not required for ordinary users.

## Phase 5 follow-up

First AWS production deployment completed on branch `deploy/aws-first-release`.
See `docs/aws-first-deployment.md` for the live HTTPS URL, image digest, OIDC
CD, rollback, and teardown. Build images with `--provenance=false --sbom=false`
so Amazon ECR basic scanning accepts a single Docker manifest.

