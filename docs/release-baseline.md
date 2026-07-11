# SafeRoute Release Baseline

> Purpose: establish a trustworthy, evidence-based snapshot of the repository
> before any bug fixing, testing, redesign, or deployment work begins.
> All command results below are copied from real executions on the machine
> described under "Baseline information". Nothing here is assumed or invented.

## Baseline information

| Field | Value |
| ----- | ----- |
| Date | Saturday, 11 July 2026 |
| Local timezone | AEST (UTC+10) |
| Branch | `chore/release-baseline` (created from `main`) |
| Source commit | `8dc28b31e2dd566dcc6cae410c87429ec7a798ce` ("Add Docker support with multi-stage build and Docker Compose setup") |
| Working-tree status | NOT clean — 4 pre-existing uncommitted modifications carried over from `main` (see below) |
| Operating system | Windows 10.0.26200 (win32) |
| Shell | PowerShell |
| Node version | v22.17.1 |
| npm version | 10.9.2 |
| Docker version | Client 29.1.3 installed; **daemon NOT running** (see Command results) |

### Uncommitted changes present at baseline (not created by this phase)

These were already modified in the working tree before Phase 1 began. They were
**not** committed, stashed, or discarded — they were carried unchanged onto the
`chore/release-baseline` branch.

| File | Nature of change |
| ---- | ---------------- |
| `Dockerfile` | Base image `node:20-alpine` → `node:20-slim`; added `INSECURE_NPM_SSL` build arg; `groupadd/useradd` instead of `addgroup/adduser`; `NODE_TLS_REJECT_UNAUTHORIZED=0` guarded behind `INSECURE_NPM_SSL` for Google Fonts during build |
| `docker-compose.yml` | Added `INSECURE_NPM_SSL` build arg (defaults to `true`); `--env-file` usage note |
| `src/app/layout.tsx` | Replaced `next/font/google` (Inter) with a manual Google Fonts `<link>` |
| `tailwind.config.js` | Font family `var(--font-inter)` → `'Inter'` |

These are a self-consistent set of workarounds for a proxy/TLS-restricted Docker
environment. See "Current blockers" for the TLS-verification security note.

## Repository summary

| Area | Detail |
| ---- | ------ |
| Frameworks | Next.js 16.2.9 (App Router, Turbopack, `output: 'standalone'`), React 19.2.7, TypeScript 6.0.3 (strict), Tailwind CSS 3.4.19, Framer Motion 12, Mapbox GL JS 3.25 |
| Main application areas | Pages: `/`, `/request`, `/dispatcher`, `/driver`, `/track/[requestId]`, `/dashboard`, `/settings`, `/about` |
| API routes | `POST /api/geocode-batch`, `POST /api/optimize`, `POST /api/route`, `POST /api/directions` (all call Mapbox server-side) |
| State management | React Context (`TripContext`, `ThemeContext`) + custom hooks (`useTrip`, `useActiveTrip`, `useDispatcherQueue`, `useAnalytics`, `useSettings`, etc.) |
| Algorithm locations | `src/lib/algorithms/haversine.ts` (Haversine distance), `src/lib/algorithms/nearestNeighbor.ts` (`nearestNeighborRoute` O(n²) greedy, `fifoRoute`, `calculateTotalDistance`) |
| Geolocation | `src/lib/origin.ts` — `navigator.geolocation.getCurrentPosition` with timeout + coordinate validation, falling back to `MONASH_FALLBACK_ORIGIN` |
| Persistence | Browser `localStorage` via `src/services/tripRepository.ts`, `src/services/requestRepository.ts`, and `src/hooks/useSettings.ts`. Keys: `saferoute_trips`, `saferoute_dispatch`, `saferoute_ride_requests` (+ theme/settings). **Persists across sessions** — see documentation audit. |
| CI workflow | `.github/workflows/ci.yml` — lint → typecheck → build on push to `main`/`develop` and PRs to `main`. Tests conditionally skipped (no real `test` script). |
| Docker configuration | Multi-stage `Dockerfile` (base/deps/builder/runner), non-root `nextjs` user, `HEALTHCHECK`, standalone output. `docker-compose.yml` for local runs. |
| Testing setup | **None.** No test framework, no `test` script, no `*.test.*`/`*.spec.*` files, no coverage config. |
| Deployment configuration | README names Vercel, but there is **no `vercel.json`, no live URL, and no cloud/IaC configuration** committed. |

## Command results

All commands run from repo root in PowerShell on the machine described above.

| Command | Status | Important output | Likely cause if failed |
| ------- | ------ | ---------------- | ---------------------- |
| `npm ci` | PASS | `added 394 packages, and audited 395 packages in 36s`; `2 moderate severity vulnerabilities` | — |
| `npm run lint` | PASS | `eslint .` → `✖ 6 problems (0 errors, 6 warnings)` (warnings only: 1 anonymous default export, 4 `react-hooks/exhaustive-deps`, 1 `@next/next/no-page-custom-font` in `layout.tsx` from the uncommitted font change) | — |
| `npm run typecheck` | PASS | `tsc -p tsconfig.json --noEmit` → exit 0, no diagnostics | — |
| `npm run build` | PASS | `Next.js 16.2.9 (Turbopack)` → `✓ Compiled successfully`; 13 routes generated; 4 API routes dynamic, `/track/[requestId]` dynamic, remainder static; build also read a local untracked `.env.local` | — |
| `docker build -t saferoute:baseline .` | NOT RUN — environment limitation | `error during connect: ... open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`; `docker info` shows a Client section but no Server section | Docker CLI is installed (v29.1.3) but the Docker Desktop **daemon is not running**. This is an environment limitation, **not** an application-code failure. The Dockerfile passed static inspection but is **unverified**. |

### Notes on warnings vs blocking errors

- Lint reports **0 errors, 6 warnings** — non-blocking. One warning
  (`no-page-custom-font` in `layout.tsx`) originates from the uncommitted manual
  Google Fonts change, not from committed code.
- `npm ci` reports **2 moderate severity vulnerabilities** — recorded, not yet
  triaged. Not build-blocking. (A full `npm audit` review is deferred to a later
  phase / CI security step.)

## Environment-variable inventory

Only variables actually referenced by application code, plus documented-but-unused
variables, are listed. **No real values are included.**

| Variable | Client or server | Used in | Required when | Documentation status | Risk |
| -------- | ---------------- | ------- | ------------- | -------------------- | ---- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Client-visible (`NEXT_PUBLIC_*`, embedded in browser bundle at build time). Also read server-side in API routes, but it is the same public token. | `src/lib/mapbox.ts`, `src/lib/search.ts`, `src/components/map/{MapView,DriverMapView,TrackingMapView}.tsx`, and (via `getMapboxToken`) `src/app/api/{directions,route,geocode-batch}/route.ts` | Build time (baked into client bundle) **and** runtime (server API routes). App builds without it but maps/geocoding/routing fail at runtime. | Documented in README, `.env.example`, and `docs/ci-cd.md`. | Public Mapbox token is exposed to the browser **by design**. Requires URL/origin restrictions and minimal scopes on the Mapbox account. Repository cannot enforce this; must be set in the Mapbox dashboard. |
| `MAPBOX_SECRET_TOKEN` | (Intended server-only) | **Not referenced by any code.** | Never (unused) | Present as a commented placeholder in `.env.example`. | Misleading — implies server-side secret handling that does not exist. Low risk, documentation only. |
| `NEXT_PUBLIC_DEFAULT_ORIGIN_LAT` / `_LNG` / `_LABEL` | (Intended client) | **Not referenced by any code.** Origin is hard-coded in `src/lib/constants.ts` (`MONASH_FALLBACK_ORIGIN`). | Never (unused) | Commented placeholders in `.env.example`. | Documentation overstates configurability. Low risk. |
| `NEXT_PUBLIC_SEARCH_COUNTRY` | (Intended client) | **Not referenced by any code.** Country is hard-coded to `AU` in `src/lib/search.ts` / `src/lib/mapbox.ts`. | Never (unused) | Commented placeholder in `.env.example`. | Documentation overstates configurability. Low risk. |

### Secret-handling assessment

- **No hard-coded API keys, tokens, or private keys** found in source, workflows,
  Docker files, or docs (scanned for `pk.`/`sk.`/`sk_live`/`AKIA`/`ghp_`/PEM patterns).
- **No `.env` or `.env.local` is tracked** by Git; `git log --all -- .env .env.local`
  returns nothing (never committed). Only `.env.example` (placeholders) is tracked.
- `.gitignore` and `.dockerignore` both exclude `.env*` variants while allowing
  `.env.example`.
- **TLS verification concern (from uncommitted changes):** `docker-compose.yml`
  defaults `INSECURE_NPM_SSL` to `true`, and the `Dockerfile` uses
  `npm config set strict-ssl false` and `NODE_TLS_REJECT_UNAUTHORIZED=0` when that
  flag is set. This disables TLS certificate verification during image build. It is
  a deliberate proxy workaround, but should default to `false` and be opt-in only.
  Not a leaked credential, but a supply-chain integrity risk worth flagging.

## Documentation claim audit

Source: `README.md`, `LICENSE`, `package.json`, `docs/ci-cd.md`.

| Claim | Status | Repository evidence | Required correction |
| ----- | ------ | ------------------- | ------------------- |
| "Next.js 14+" (Tech Stack table) | Partially verified | `package.json` pins `next ^16.2.9`; build banner confirms `Next.js 16.2.9`. "14+" is technically not false but understates/misdescribes the actual version. | Update to "Next.js 16" (Phase 8). |
| License = MIT | Incorrect / inconsistent | `LICENSE` file is MIT **but** `Copyright (c) 2026 Ekachit`; `package.json` says `"license": "ISC"`; README says MIT "Built by Madhav". Three-way mismatch, and the copyright names a different person. | Reconcile license across `LICENSE` + `package.json` + README, and correct the copyright holder. Ownership-evidence concern for a portfolio project. (Phase 8; small correction only if needed sooner.) |
| Deployment = Vercel | Unsupported | No `vercel.json`, no CI deploy step, no live URL in the repo. | Either add a real deployment + link or mark as "not yet deployed" (Phase 5/6/8). |
| Test coverage | Not currently testable / Unsupported | No tests exist. README does not explicitly claim coverage, but the CI badge + "runs linting, typechecking, and a production build" is accurate (tests are conditionally skipped). | Add tests (Phase 3) before any coverage claim. |
| "Privacy-Focused: No data persistence — addresses stored in browser session only" and "Addresses are cleared when you close the browser tab" | Incorrect | `tripRepository.ts`, `requestRepository.ts`, `useSettings.ts` write to **`localStorage`**, which persists across browser sessions and is **not** cleared on tab close. | Correct the privacy notice to describe `localStorage` persistence accurately. This is both a factual and a privacy-representation issue — flagged for early correction. |
| "No addresses are saved to your device or our servers" | Partially verified / misleading | True that nothing is sent to a first-party server (no backend DB). False regarding "your device" — addresses persist in `localStorage` on the device. Addresses **are** sent to Mapbox (correctly disclosed elsewhere). | Clarify device-side persistence. |
| Route improvement "15–35%" and the example comparison table (52.3 → 41.2 km, 21%) | Unsupported | No benchmark methodology, dataset, or reproducible measurement in the repo. Numbers are illustrative. | Add benchmark methodology (Phase 8) or label numbers as illustrative. |
| Screenshot `![SafeRoute Dashboard](./docs/demo.png)` and "Screenshots" section | Incorrect (broken) | `docs/demo.png` does not exist; the Screenshots section contains only placeholder text. | Add real screenshots (Phase 8). |
| "Enter up to 15 passenger addresses" / `MAX_STOPS` | Verified | `src/lib/constants.ts` → `MAX_STOPS = 15`. | None. |
| Nearest-neighbor heuristic, O(n²) | Verified | `src/lib/algorithms/nearestNeighbor.ts` implements greedy NN; complexity matches. | None. |
| CI runs lint + typecheck + build on push/PR | Verified | `.github/workflows/ci.yml` matches. | None (mandatory-tests hardening deferred to Phase 4). |
| "Deployment | Vercel" env var docs (`NEXT_PUBLIC_MAPBOX_TOKEN` required) | Verified | Matches code usage. | None. |
| LinkedIn link `linkedin.com/in/your-profile` | Incorrect (placeholder) | Placeholder URL in README footer. | Replace with real profile (Phase 8). |

## Current blockers

| Severity | Blocker | Notes |
| -------- | ------- | ----- |
| Critical | None | No failing build/lint/typecheck; no leaked secrets. |
| High | Inaccurate privacy/persistence claim | README states no persistence / cleared on tab close, but data is stored in `localStorage`. Factual + privacy-representation issue. Recommend early correction even though full README rewrite is Phase 8. |
| High | Docker build unverified | Daemon not running in this environment. Must be verified before Phase 5/6 deployment claims. Not an app-code failure. |
| Medium | TLS verification disabled in Docker build path | `INSECURE_NPM_SSL` defaults `true` in compose; `strict-ssl false` + `NODE_TLS_REJECT_UNAUTHORIZED=0` in Dockerfile. Should default to secure and be opt-in. |
| Medium | License / copyright / author inconsistency | MIT vs ISC vs "Ekachit" vs "Madhav". Affects portfolio ownership evidence. |
| Medium | No automated tests | Blocks Phase 3/4 mandatory-test goals. Algorithms are pure and highly testable. |
| Low | 2 moderate npm vulnerabilities | From `npm ci` audit. Triage in a later security step. |
| Low | Unused documented env vars | `.env.example` lists 4 variables the code never reads. |
| Low | Broken README image + placeholder screenshots/links | Cosmetic/documentation; Phase 8. |
| Low | 6 lint warnings | Non-blocking; `exhaustive-deps` + custom-font warning. |

## Known uncertainties

Static inspection and local build commands could **not** verify the following.
These require a running environment, real credentials, or external testing:

- Browser runtime behaviour of the app (rendering, interactions).
- Mobile vs desktop responsiveness and reliability.
- Mapbox account restrictions, token scopes, and rate-limit behaviour.
- Live Mapbox Geocoding / Directions / Search API responses.
- Location-permission prompts and the Monash fallback path in a real browser.
- Docker image build and runtime (daemon unavailable here).
- Any cloud deployment success (none configured).
- External/user testing outcomes.
- Whether the 2 moderate npm vulnerabilities are reachable/exploitable in practice.

## Recommended next phase

The baseline is **sufficiently understood**: dependency install, lint, typecheck,
and production build all pass; secret hygiene is clean; the Docker build is
clearly recorded as environment-limited; and documentation claims have been
audited against the implementation.

Proceeding to **Phase 2 — Core workflow stabilisation** is reasonable **once**
the two High blockers are acknowledged (privacy-claim accuracy and Docker
verification). Per the working rules, Phase 2 must not begin until explicitly
authorised.
