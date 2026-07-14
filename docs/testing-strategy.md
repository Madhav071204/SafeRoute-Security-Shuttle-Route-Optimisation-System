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
overflow (now a normal pass), geolocation denied/granted, route-fallback
presentation, and — added in Phase 3B — the **complete driver execution
journey** and driver-mode **regressions**:

- `driver-journey.spec.ts` — one realistic plan → optimise → select → start →
  driver mode → advance through every stop → completed-state journey, asserting
  user-visible behaviour (current-stop advancement, `X/Y completed`, the
  completed screen, and that no completion control remains enabled afterwards).
- `driver-regressions.spec.ts` — DEF-2 (stale route invalidated after adding or
  removing a stop), DEF-7 (a synchronous double activation cannot skip a stop),
  drawer scrolling + final-stop reachability + End Trip access at 390×844,
  refresh-resets-to-planner, and synthetic-geolocation stability (map container
  visible, no blank page, no recalculation loop).
- `e2e/fixtures/driverJourney.ts` — small reusable fixtures (`mockDriverApis`,
  `planDemoRoute`, `startTripSkippingLocation`, `completeCurrentStop`,
  `mockDirections` with a request counter) built on `mockApi.ts`. Only external
  boundaries are mocked; React state, stop-completion, the drawer, persistence
  and driver controls run for real.

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
- **Blank page / render loop after load and after geolocation** — smoke,
  geolocation and driver-mode E2E give evidence of no fatal error and no runaway
  request loop (driver-mode directions requests are counted and bounded).
- **Mobile horizontal overflow** — reproduced, then **fixed** in Phase 3B (the
  top navigation now collapses into a mobile menu below `md`). The former
  expected-to-fail test is now a normal passing test.
- **DEF-2 stale route after editing stops** — reproduced and **fixed**
  (`TripContext` invalidates routes on stop add/remove/address change); E2E
  regression added.
- **DEF-7 double activation of stop completion** — reproduced and **fixed**
  (re-entrancy guard in `markStopComplete`); E2E regression added.
- **Drawer scrolling / mobile final-stop access** — exercised at 390×844; the
  drawer scrolls and the final stop is reachable. The one real issue found was a
  missing accessible name on the icon-only End Trip button (**fixed**).
- **Refresh during an active trip** — the home-page flow intentionally resets to
  a clean planner (in-memory state, no persistence); verified as the intended
  contract, not data loss.

See the Phase 3B section of `docs/core-workflow-runtime-audit.md` for the full
driver-journey architecture map, reproduction details and fixes.

## Known testing gaps

- Coverage is measured only for core logic (`src/lib/**`, `src/app/api/**`,
  `src/components/results/**`). Presentational, map, driver-mode, search and
  trip-history modules are exercised (if at all) via E2E, not coverage, so the
  aggregate coverage number is intentionally conservative.
- Playwright Chromium binaries could not be downloaded in the local sandbox (a
  TLS-intercepting proxy blocks the browser CDN). Locally the suite runs against
  the **OS-installed Chrome** via the `chrome` channel; **in CI** the CDN is
  reachable, so the workflow installs and uses Playwright's **bundled Chromium**
  (`PLAYWRIGHT_CHANNEL=chromium`). The channel is configurable in
  `playwright.config.ts`. Firefox/WebKit engines are not exercised in this phase.
- Driver-mode turn-by-turn navigation is exercised end-to-end with mocked
  directions, but **live Mapbox map-tile rendering** is not asserted (the map
  degrades to a visible configuration notice when no token is present).

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

Because the production build uses `output:'standalone'`, `next start` prints a
harmless advisory warning. For a warning-free E2E build (used in CI) set
`NEXT_DISABLE_STANDALONE=1` before building — e.g. on bash
`NEXT_DISABLE_STANDALONE=1 npm run build`, on PowerShell
`$env:NEXT_DISABLE_STANDALONE='1'; npm run build`. This omits only the
standalone artifact and does not change the production/Docker deployment build.

## CI strategy (implemented — Phase 3B)

`.github/workflows/ci.yml` runs two jobs on every pull request (any base branch)
and on pushes to `main`/`develop`, with concurrency cancellation:

- **`validate`** (mandatory, blocking): `npm ci` → `npm run lint` →
  `npm run typecheck` → `npm test` → coverage (**non-blocking**,
  `continue-on-error`, informational only) → `npm run build`. The old logic that
  could silently skip tests when a test script was "absent" was removed — a
  failed test now fails CI.
- **`e2e`** (`needs: validate`): `npm ci` →
  `npx playwright install --with-deps chromium` (Chromium only) →
  `NEXT_DISABLE_STANDALONE=1 npm run build` → `npm run test:e2e`
  (`PLAYWRIGHT_CHANNEL=chromium`) → upload `playwright-report/` + `test-results/`
  **only on failure** (7-day retention).

**Required checks:** lint, typecheck, unit/API/component tests, production build,
and the Playwright browser job. **Coverage is not a blocking gate yet** (scope is
core logic only); it is generated as an informational step.

**External API isolation:** unit/API tests stub the global `fetch`; E2E
intercepts every `/api/*` call. **CI needs no `.env.local` and no live Mapbox
token** — the build compiles without one (the map degrades to a notice), so
missing Mapbox credentials never fail deterministic tests. No secret placeholder
is required for compilation. TLS verification is never disabled.

**Standalone-output handling:** the production/Docker build keeps
`output:'standalone'`; the E2E job builds with `NEXT_DISABLE_STANDALONE=1` so
`next start` runs without the standalone warning (Option 2 — a dedicated
warning-free test build that does not alter the production configuration).

**Known CI gaps:** only Chromium runs (no Firefox/WebKit); coverage is not
gated; the workflow was validated locally by YAML parse only (no live Actions
run or `actionlint` available in this environment).

## Remaining manual validation

- Real Mapbox map-tile rendering and the live on-map polyline.
- Real-device GPS accuracy, permission prompts, and off-route recalculation while moving.
- Safari/iOS behaviour and Firefox/WebKit engines.
- Touch behaviour on a physical phone; visual/pixel and dark-mode polish.
