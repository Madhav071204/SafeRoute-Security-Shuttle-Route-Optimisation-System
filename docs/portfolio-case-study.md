# SafeRoute Portfolio Case Study

## Situation

I built SafeRoute as a personal proof-of-concept inspired by university security-shuttle drop-offs. Operators often deliver passengers in boarding order (FIFO), which can create inefficient road paths when destinations are scattered. The project is a portfolio demonstration with a live AWS deployment — **not** an official Monash system and **not** an enterprise operations product.

## Problem

For small multi-stop trips, FIFO can force backtracking. I wanted a working product that:

1. Accepts destinations with real map geocoding and road routing
2. Compares FIFO with a simple reorder
3. Supports a driver execution flow
4. Ships with automated tests and a repeatable cloud deploy path

Constraints included time, Mapbox quota discipline, and honesty about what a heuristic can claim.

## My responsibility

I owned the full path from core workflow stabilisation through API validation, automated testing, Docker hardening, AWS ECS + OIDC deployment, production acceptance, a six-scenario route benchmark, and interview-ready documentation.

## Technical approach

- **Next.js App Router** API routes for geocode, optimize, route, and directions
- **Nearest-neighbour** ordering in TypeScript (`O(n²)`), FIFO as the baseline
- **Mapbox** for Search Box autocomplete, geocoding, Directions, and GL maps
- **React Context** for trip/theme state at current scale
- **Vitest** for unit/API/component tests; **Playwright** for local E2E and production smoke
- **Docker** multi-stage Node 22 standalone image; **ECR + ECS Express Mode** via **GitHub Actions OIDC**

## Key decisions

| Decision | Why |
|----------|-----|
| Nearest neighbour instead of brute-force TSP | Feasible for ≤15 stops; easy to explain; no false “optimal” claim |
| React Context instead of a heavier store | Sufficient for single-operator browser state |
| Strict API validation | Reject bad coordinates/orders with clear codes instead of returning null metrics |
| Explicit Mapbox vs Haversine `routeSource` | Operators can tell road results from straight-line fallback |
| Node 22 + standalone Docker | Align runtime with engines; smaller runnable image for ECS |
| AWS ECS + OIDC | Portfolio-grade deploy without long-lived CI cloud keys |
| Automated testing pyramid | Protect regressions while keeping CI Mapbox-free via mocks |

## Difficult problems solved

Verified fixes from earlier phases:

- **Coordinate value zero validation** — `0` is a valid latitude/longitude component; validation no longer treated it as missing
- **Invalid coordinates producing null distances** — API routes reject invalid stops before routing
- **Stale route after stop edits** — regenerating comparison when the stop set changes
- **Double stop completion** — driver completion guarded against duplicate advances
- **Mobile navigation overflow** — responsive header/drawer behaviour for narrow viewports
- **ECS deployment permission gap** — IAM needed `ecs:RegisterTaskDefinition` for Express Mode updates
- **Immutable ECR rerun issue** — redeploys tolerate an already-pushed immutable tag
- **Deployment URL health-gate race** — poll ACTIVE / ingress URL / `/api/health` separately with retries and configured URL fallback

## Testing and evidence

- **89** Vitest tests; **17** local Playwright; **5** production Playwright
- CI: lint, typecheck, unit/API/component tests, build, Playwright, OIDC deploy on `chore/release-baseline`
- Production planning→driver journey verified with synthetic public destinations
- Owner manual testing of production; informal peer sharing only — **no formal structured user testing**

## Benchmark findings

Six Mapbox road scenarios from Monash Clayton (2026-07-21):

- Distance improved under nearest neighbour in all six
- Duration improved in five; **worse in one** (duplicate Chadstone stops)
- Median percentage distance difference **16.57%** (range 0.84%–23.27%)

Full raw table: [`route-benchmark-results.md`](./route-benchmark-results.md). Illustrative only — not a scientific operations study and not global optimality.

## Security and privacy

- `localStorage` may retain trip/dispatch/request/settings data across sessions
- Server Mapbox token in Secrets Manager; production public token URL-restricted
- Non-root container; input validation on APIs
- Residual Debian base-image Critical/High findings documented (low runtime relevance for unused Perl tooling)
- No authentication; shared browsers are a real risk

## Limitations

No auth, no central DB, heuristic routing, Haversine vs road mismatch, small benchmark sample, no formal user testing, limited real-device GPS validation, residual base-image CVEs, and AWS may be shut down for cost.

## Lessons learned

- Distinguish **ordering metric** (Haversine) from **evaluation metric** (road network) early
- Surface fallback state in the API contract or operators will trust the wrong numbers
- Cloud CD fails on IAM and health-gate timing as often as on application code
- Portfolio credibility comes from **preserving negative and equal results**, not from marketing percentages

## What I would change for a real production system

Authentication and roles, a server-side store with retention policy, traffic-aware or 2-opt improvement with clear optimality language, structured usability testing, dedicated Mapbox tokens per environment with monitoring, patched base images on a schedule, and operational runbooks beyond a single ECS service.
