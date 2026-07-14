# SafeRoute Testing Strategy

Phase 3 introduces the project's first automated test suite. It focuses on the
core trip-planning workflow: coordinate validation, the routing algorithms, the
four `/api/*` handlers, the route-comparison result view, and a small browser
smoke/regression suite.

## Testing objectives

- Lock in the Phase 2B API-stabilisation behaviour with executable regression
  tests (coordinate validation, the 15-destination limit, duplicate handling,
  zero-coordinate handling, and explicit Mapbox-vs-fallback route sourcing).
- Prove the pure algorithms (Haversine distance, nearest-neighbour ordering)
  are correct, deterministic and side-effect free.
- Give repeatable browser evidence for scenarios that were previously
  "browser-blocked" in Phase 2A/2B, without depending on live Mapbox.
- Keep tests deterministic, order-independent and free of credentials or real
  user location data.

## Test layers

### Unit
Pure functions with no I/O. `tests/unit/`:
- `haversine.test.ts` — distance formula (identical points, known public pair,
  symmetry, hemispheres, zero coordinate, very short distance, finite/non-negative).
- `nearestNeighbor.test.ts` — ordering contract (empty/one/many stops, zero
  coordinate, duplicate coordinates preserved, every stop once, no input
  mutation, deterministic ties, origin kept separate, finite total). These tests
  deliberately do **not** assert global optimality — nearest-neighbour is a
  heuristic.
- `validation.test.ts` — the shared Phase 2B validator (`isFiniteNumber`,
  `isValidLatitude`, `isValidLongitude`, `isValidCoordinates`) plus the
  destination-limit constants.

### API / integration
`tests/api/` invokes each route handler directly with a constructed
`NextRequest` and asserts the HTTP contract. External Mapbox is mocked only at
the network boundary (`fetch`); validation and the handlers themselves are never
mocked. Covers `/api/optimize`, `/api/route`, `/api/geocode-batch`,
`/api/directions`.

### Component
`tests/component/RouteComparison.test.tsx` (jsdom) verifies the fallback
presentation: the estimate notice appears only for a `haversine-fallback`
result, never for `mapbox`; the notice describes values as approximate estimates
(not live road-network results); and distance/duration remain visible. Context
and settings hooks are mocked so the test targets presentation, not wiring.

### End-to-end
`e2e/` (Playwright, Chromium) drives the running app in a real browser. All
`/api/*` calls are intercepted with deterministic mocks, so E2E never touches
live Mapbox. Covers: application smoke, responsive reachability, horizontal
overflow, geolocation denied/granted, and route-fallback presentation.

### Manual testing still required
- Visual/pixel correctness, animation quality and dark-mode styling.
- Real Mapbox road-network rendering and the live polyline on the map.
- Full driver-mode turn-by-turn navigation, off-route recalculation, and the
  upcoming-stops drawer on real devices.
- Real-device geolocation accuracy and permission prompts.

## Tools and reasons

| Tool | Role | Why |
| ---- | ---- | --- |
| **Vitest** | Unit + API + component runner | Native TS/ESM, fast, one config for Node and jsdom; matches the project's mixed CJS/ESM setup without extra transpilation. |
| **@vitejs/plugin-react** | JSX transform for component tests | React 19 automatic runtime support. |
| **jsdom** | DOM for the one component test | Only loaded for files with a `// @vitest-environment jsdom` docblock; Node is the default. |
| **@testing-library/react** + **jest-dom** | Component rendering/assertions | Behaviour-focused queries; avoids implementation-detail snapshots. |
| **Playwright** | Browser E2E | Reliable auto-waiting, request interception for Mapbox-free determinism, per-context geolocation/permission control. |

Jest and Cypress were deliberately **not** added (Vitest and Playwright cover
their roles).

## Test data and privacy

- All coordinates are synthetic public values around the Clayton/Monash area or
  well-known cities (e.g. London/Paris for a known-distance check).
- No real user location is recorded. The "granted geolocation" E2E test injects
  synthetic coordinates via the browser context; exact values are not documented.
- No credentials are committed. API tests set a dummy `NEXT_PUBLIC_MAPBOX_TOKEN`
  only in-memory for the test run; `.env.local` is never read or committed.

## External API mocking strategy

- **Unit/API layer:** stub the global `fetch` (the true external boundary).
  Validation and handler logic run for real. Both a successful Mapbox response
  and a safe Mapbox failure (which activates the Haversine fallback) are
  simulated. TLS verification is never disabled.
- **E2E layer:** intercept the app's own `/api/geocode-batch`, `/api/optimize`
  and `/api/route` with Playwright route handlers returning deterministic
  synthetic data, including a `routeSource: "haversine-fallback"` variant to
  drive the fallback notice.

## Covered risks

- Malformed/`null`/`NaN`/`Infinity`/numeric-string/out-of-range coordinates are
  rejected with `400`, never silently filtered.
- Zero-valued coordinates are treated as valid locations.
- The 15-destination server-side cap is enforced (exactly 15 accepted, 16
  rejected) across optimize, route and geocode-batch.
- Duplicate destinations are preserved end to end.
- `routeSource`/`isFallback` are consistent, and Mapbox failures never leak the
  upstream URL, `access_token`, or the token value.
- Geocode-batch validates structure before any Mapbox call.

## Historical regression coverage

See the Phase 3 section of `docs/core-workflow-runtime-audit.md` for the
per-defect classification (reproduced / not reproduced / partially / still
blocked). Summary:

- **Route fallback labelling** — reproduced and covered (unit, component, E2E).
- **Blank page / render loop after load and after geolocation** — smoke and
  geolocation E2E give evidence of no fatal error and no runaway request loop.
- **Mobile horizontal overflow** — reproduced as a confirmed layout defect
  (top navigation does not collapse at 390px width).
- **Driver-mode defects** (DEF-2 stale route, DEF-3 refresh persistence, DEF-7
  double stop-completion, drawer scrolling, mobile final-stop access) — require
  full driver-mode execution and are only partially reachable without production
  refactoring; classified honestly in the audit.

## Known testing gaps

- Coverage is measured only for core logic (`src/lib/**`, `src/app/api/**`,
  `src/components/results/**`). Presentational, map, driver-mode, search and
  trip-history modules are exercised (if at all) via E2E, not coverage, so the
  aggregate coverage number is intentionally conservative.
- Playwright Chromium binaries could not be downloaded in the sandbox (a
  TLS-intercepting proxy blocks the browser CDN). The suite runs against the
  **OS-installed Chrome** via the `chrome` channel instead; other browser engines
  (Firefox/WebKit) are not exercised.
- Driver-mode turn-by-turn navigation and map rendering are not automated.

## How to run tests

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # Vitest unit + API + component (run once)
npm run test:watch    # Vitest watch mode
npm run test:coverage # Vitest with v8 coverage
npm run build         # required before e2e (production server)
npm run test:e2e      # Playwright browser tests (production server on :3123)
npm run test:e2e:headed
npm run build         # Next.js production build
```

Playwright runs against a **production** server (`next start` on port 3123),
which it starts automatically (or reuses if already listening). A build must
exist first — run `npm run build` before `npm run test:e2e`. Production
hydration is deterministic (unlike dev mode) and `next start` coexists with a
developer's `next dev` on :3000. Tests drive the OS-installed Chrome via the
`chrome` channel; no browser binaries are committed.

## CI integration recommendation

- Extend `.github/workflows/ci.yml` to run `npm test` (already auto-detected)
  and `npm run test:coverage` on every PR — these are hermetic and fast.
- Run Playwright as a separate job that installs Chromium via
  `npx playwright install --with-deps chromium` on the CI runner (where the
  browser CDN is reachable) and runs against a production build (`next build`
  then `next start`) rather than dev mode, for stability.
- Do not gate on live Mapbox; keep the deterministic mocks. Consider a small
  coverage threshold only after coverage scope is expanded to more modules.
