# SafeRoute Core Workflow Runtime Audit

> Phase 2A — investigation and evidence gathering only. No application defects were
> fixed as part of this audit. No new features, tests, deployment, or UI redesign
> were performed.

## Audit environment

| Field | Value |
| ----- | ----- |
| Date / timezone | 2026-07-12, AEST (UTC+10) |
| Branch | `chore/release-baseline` |
| Commit (HEAD) | `5e1ad0d` (`chore: align project ownership and MIT license`) |
| Phase 1 commits present | `6f1058c`, `5e3bf0a`, `5e1ad0d` |
| Working-tree status | 4 pre-existing modified files only: `Dockerfile`, `docker-compose.yml`, `src/app/layout.tsx`, `tailwind.config.js` — **not touched by this audit** |
| Operating system | Windows (win32 10.0.26200), PowerShell |
| Node version | v22.17.1 |
| npm version | 10.9.2 |
| Framework | Next.js 16.2.9 (Turbopack), React 19.2.7 |
| Application URL | `http://localhost:3000` (port 3000 was free) |
| Browser and version | **None.** No browser was driven — see "Environment limitations". |
| Viewports tested | **None** (no browser automation available) |
| Mapbox availability | `NEXT_PUBLIC_MAPBOX_TOKEN` variable name present in `.env.local` (value **not** read, printed, or exposed). **Runtime connectivity is intermittent in this environment — see the two 2026-07-13 continuation sections below:** the same running server (same PID) failed every server-side Mapbox call with a Node TLS chain error (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) in one pass, then succeeded with live road/geocode/directions data ~10 minutes later. Live success proves the token is valid; the failures are an environment/TLS condition, not an application defect. |

### Testing method and its boundary

Two categories of evidence were gathered:

1. **Runtime API / server evidence (performed).** The dev server was started and the
   four core API routes plus all seven page routes were exercised directly over HTTP
   with synthetic public data. These results are real.
2. **Static code analysis (read-only).** The full client journey (React components,
   hooks, context) was read to map data flow and to reason about behaviour that
   cannot be observed without a browser.

The environment has **no browser-automation capability** (no Playwright/Puppeteer/MCP
browser), and installing a testing framework is prohibited in Phase 2A. Therefore every
scenario that requires a rendered DOM, real geolocation permission, map painting, click
interaction, responsive viewport, or the browser console/network panel is recorded as
**Blocked by environment** or **Not tested**, never as Pass. Code-level reasoning is
reported separately and never counted as a Pass.

---

## Runtime architecture summary

### Trip-planning data flow (home page `/`)

1. **Destination entry** — `src/app/page.tsx` renders `TripPanel`
   (`src/components/trip/TripPanel.tsx`) → `StopList` → `StopInput`
   (`src/components/trip/StopInput.tsx`). Each stop uses `AddressSearchInput`
   (`src/components/stops/AddressSearchInput.tsx`) backed by `useAddressSearch`
   (`src/hooks/useAddressSearch.ts`).
2. **Address resolution** — two paths:
   - Autocomplete: `src/lib/search.ts` calls Mapbox **Search Box** `suggest`/`retrieve`
     **directly from the browser** (client-side, `NEXT_PUBLIC_MAPBOX_TOKEN`). Selecting a
     suggestion sets `coordinates` on the stop.
   - Bulk geocode: the "Locate addresses" button posts to `/api/geocode-batch`
     (`src/app/api/geocode-batch/route.ts` → `batchGeocodeAddresses` in
     `src/lib/mapbox.ts`, Mapbox Geocoding v5, server-side).
3. **Ordering** — `TripPanel.handleOptimize` acquires live location (`getCurrentLocation`
   in `src/lib/origin.ts`, 6 s timeout), resolves the origin (live vs Monash fallback via
   `resolveRouteOrigin`), then POSTs geocoded stops to `/api/optimize`
   (`src/app/api/optimize/route.ts`).
4. **FIFO + optimised generation** —
   - **FIFO** order is generated client-side in `TripPanel` simply as the stops' input
     order (`geocodedStops.map(s => s.id)`); `fifoRoute()` also exists in
     `src/lib/algorithms/nearestNeighbor.ts`.
   - **Optimised** order comes from `/api/optimize` →
     `nearestNeighborRoute()` (greedy nearest-neighbour, **Haversine** straight-line
     distance) in `src/lib/algorithms/nearestNeighbor.ts`.
   - Both orders are then sent to `/api/route` (`src/app/api/route/route.ts`) to fetch
     **road** distance/duration/polyline. `/api/route` uses Mapbox Directions
     (`getDirections`, `driving` profile) when a token is present and **falls back to
     Haversine** straight-line estimates + `AVERAGE_SPEED_KMH` (40) when Mapbox is
     unavailable or fails.
5. **Display** — `MapView` (`src/components/map/MapView.tsx`) paints markers + decoded
   polyline; `RouteComparison` (`src/components/results/RouteComparison.tsx`) shows FIFO
   vs optimised metrics and savings.
6. **Route selection** — `RouteComparison` `MetricsCard`s call `setSelectedRouteType`.
   Default selection is `'optimized'`.
7. **Driver mode start** — `TripPanel` "Start Trip" → location prompt → `startExecution`
   sets `trip.status = 'executing'`; `page.tsx` then renders `ExecutionView`.
8. **Stop completion** — `DriverModeView` (`src/components/execution/DriverModeView.tsx`)
   → `markStopComplete` in `TripContext`; final stop sets `status='completed'` and calls
   `saveCompletedTrip` (`src/lib/trips.ts` → `tripRepository`).
9. **Persistence / clearing** — `endExecution` → `clearTrip` (resets in-memory context).
   Completed trips are written to `localStorage` key `saferoute_trips`.

### Driver-execution data flow (dedicated `/driver` page)

- `src/app/driver/page.tsx` loads an **active dispatch trip** from `localStorage`
  (`saferoute_dispatch`) via `useDriverTrip`, `loadTrip`s it into `TripContext`, and
  renders `ExecutionView` with an `onStopAction` handler that mirrors status into
  `dispatchTripRepository` + `requestRepository`.
- Live driver location: `useDriverLocation` (`src/hooks/useDriverLocation.ts`) uses
  `navigator.geolocation.watchPosition`. `DriverModeView` fetches per-leg navigation via
  `/api/directions` (`fetchDirections` in `src/lib/directions.ts`, Mapbox
  `driving-traffic`) with off-route recalculation guarded by cooldown/grace/consecutive
  counters. `DriverMapView` (`src/components/map/DriverMapView.tsx`) renders the driver
  marker, stop markers, and route line.
- `/driver` persists driver location into `saferoute_dispatch` (throttled 2 s) via
  `dispatchTripRepository.updateDriverLocation`.

### Where Haversine vs Mapbox road data is used

| Concern | Method |
| ------- | ------ |
| Nearest-neighbour **ordering** decision | **Haversine** straight-line (`nearestNeighbor.ts`) — always, even when Mapbox is available |
| Optimise endpoint `totalDistanceKm` | **Haversine** (`calculateTotalDistance`) |
| Displayed route distance / duration / polyline (`/api/route`) | **Mapbox road** when token present; **Haversine + 40 km/h** fallback otherwise |
| Turn-by-turn driver navigation (`/api/directions`) | **Mapbox road** (`driving-traffic`); no Haversine fallback (returns error 500 if no token) |
| Off-route / distance-to-point geometry (driver) | **Haversine** (`calculateDistanceToPoint`, meters) |

**Key architectural nuance:** the optimiser minimises *straight-line* distance, but the
metric shown to the user is *road* distance. These can disagree, so the "optimised"
road distance can occasionally exceed FIFO road distance.

---

## Test matrix

Status vocabulary: **Pass / Partial / Fail / Blocked by environment / Not tested**.

### 4.1 Initial state

| ID | Area | Scenario | Expected | Actual | Status | Evidence | Suspected cause |
| -- | ---- | -------- | -------- | ------ | ------ | -------- | --------------- |
| I1 | Init | `GET /` responds without server crash | 200, no error page | HTTP 200, 30,091 bytes, no error marker | Partial | server log line 18/38 | SSR OK; client render not observable |
| I2 | Init | Map renders | Map canvas visible | Cannot observe rendering | Blocked by environment | — | no browser |
| I3 | Init | Trip panel renders | Panel visible with empty state | HTML contains "Trip Planner"; empty-state code present (`StopList` empty branch) | Partial | page bytes + code | client paint not observed |
| I4 | Init | Empty state understandable | "No stops added yet" guidance | Present in `StopList.tsx` | Partial | code review | not visually confirmed |
| I5 | Init | No repeated console error loop | Clean console | Cannot read browser console | Not tested | — | no browser |

### 4.2 Stop entry

| ID | Scenario | Expected | Actual | Status | Evidence |
| -- | -------- | -------- | ------ | ------ | -------- |
| S1 | Add a stop / multiple stops | Stops append | `addStop` appends empty stop; UI gated by `MAX_STOPS=15` | Blocked by environment | `TripContext.addStop`, code only |
| S2 | Edit name/address | Fields update context | `updateStop` merges partial | Blocked by environment | code only |
| S3 | Remove a stop | Stop removed, numbers re-index | `removeStop` filters by id; badge index is array position | Blocked by environment | code only |
| S4 | Remaining stop numbers update | Sequential 1..n | Numbers derive from array index → correct by construction | Partial (code) | `StopInput index+1` |
| S5 | Address suggestions appear | Dropdown with Mapbox suggestions | Suggest API reachable (see G-series); dropdown render not observed | Blocked by environment | live search API works |
| S6 | Selecting suggestion fills address + coords | `onSelect` sets coordinates | `retrieveSuggestion` returns coords; wired in `StopInput.handleAddressSelect` | Blocked by environment | code + API |
| S7 | Keyboard navigation | Arrow/Enter/Esc/Tab | Implemented in `useAddressSearch.handleKeyDown` | Not tested | code only |
| S8 | Loading / no-result states | Spinner + "No places found" | Both states coded in `AddressSearchInput` | Not tested | code only |

### 4.3 Input validation (API performed; UI code-only)

| ID | Scenario | Expected | Actual | Status | Evidence |
| -- | -------- | -------- | ------ | ------ | -------- |
| V1 | No destinations | Cannot optimise | UI: Optimise button hidden until ≥2 geocoded (`MIN_STOPS_FOR_OPTIMIZATION`) | Partial (code) | `TripPanel` gating |
| V2 | One destination | Cannot optimise | `canOptimize` false with 1 stop | Partial (code) | `TripPanel` |
| V3 | Two valid destinations | Optimise enabled | `/api/optimize` returns order for 2+ | Pass (API) | optimize test |
| V4 | Empty address | Excluded | Stops without coords filtered out of optimise input | Pass (API) | `optimize: stops missing coords` → `[]`, 200 |
| V5 | Whitespace-only address | Treated as not found | `/api/geocode-batch` "   " → `success:false, Address not found` (still calls Mapbox) | Pass (API) | geocode test |
| V6 | Invalid / nonsense address | Reported not found | `asdkjfhqweoiuzxcvmnb123456` → `success:false, Address not found` | Pass (API) | geocode test |
| V7 | Duplicate destination | Allowed, no dedupe | Duplicate coords accepted; NN returns all ids (zero-distance leg) | Pass (API) | `optimize: duplicate coords` → `[a,b,c]` |
| V8 | Same address, different passenger | Allowed | No dedupe on passenger; both kept | Partial (code) | no dedupe logic |
| V9 | More than max stops | UI caps at 15 | `addStop` UI disabled at `MAX_STOPS`; **API enforces no maximum** | Partial | code + API has no cap |
| V10 | Remove all stops after data entry | Return to empty state | `removeStop` down to 0 → empty-state branch | Blocked by environment | code only |
| V11 | Missing origin (API) | 400 | `/api/optimize` & `/api/route` → 400 "origin coordinates required" | Pass (API) | optimize/route tests |
| V12 | Missing stops array (API) | 400 | `/api/optimize` → 400 "stops array required" | Pass (API) | optimize test |
| V13 | `addresses` field missing (API) | 400 | `/api/geocode-batch` → 400 | Pass (API) | geocode test |
| V14 | Origin `lat:0,lng:0` (API) | Valid coordinate | **Rejected 400** — truthy check `!origin.lat` treats 0 as missing | Fail (edge case) | `optimize: origin lat=0 lng=0` → 400 |

**Validation location summary:** presence/shape validation exists in the **API**
(origin/stops/addresses). Business rules (min 2 stops, max 15, requiring coordinates) are
enforced only in the **UI**. There is **no server-side maximum** and **no de-duplication**
in either layer.

### 4.4 Route calculation (API performed; UI orchestration code-only)

| ID | Scenario | Expected | Actual | Status | Evidence |
| -- | -------- | -------- | ------ | ------ | -------- |
| R1 | FIFO route generated | Road metrics returned | `/api/route` FIFO order → 200, real polyline, 3 legs, 22.37 km / 40.62 min | Pass (API) | route test |
| R2 | Optimised route generated | Road metrics for NN order | `/api/optimize` → `[a,c,b]`; `/api/route` returns road metrics | Pass (API) | optimize + route tests |
| R3 | Routes contain expected stops | All ids present in order | Legs cover every ordered id | Pass (API) | route legs |
| R4 | Stop numbering matches order | Marker number = order index | `MapView`/`DriverMapView` use `orderedStopIds.indexOf` | Partial (code) | not visually confirmed |
| R5 | Distance + duration shown | Values displayed | Metrics returned by API; render not observed | Partial | API + code |
| R6 | Loading indicators appear/resolve | Spinner then result | `isOptimizing` toggling coded | Blocked by environment | code only |
| R7 | Errors visible + actionable | Error surfaced | `handleOptimize` catch only `console.error`s — **no user-facing error UI** on optimise failure | Fail (code) | `TripPanel.handleOptimize` catch block |
| R8 | No overlapping/duplicate calculate requests | Guarded | Optimise button disabled while `isOptimizing`/`isGeocoding`/executing | Partial (code) | `isDisabled` gate |
| R9 | Repeated clicks → no infinite loop | Idempotent | Guarded by disabled state; single request | Partial (code) | code only |
| R10 | Editing a stop invalidates stale routes | Routes reset | `updateStop` sets `status:'input'` but **does not clear `routes`**; stale FIFO/optimised remain until re-optimise | Partial/Fail (code) | `TripContext.updateStop` |
| R11 | Removing a stop after calc leaves no invalid route | Route cleared/updated | `removeStop` sets `status:'input'` but leaves `routes` populated referencing removed id | Partial/Fail (code) | `TripContext.removeStop` |

### 4.5 Route comparison

| ID | Scenario | Expected | Actual | Status | Evidence |
| -- | -------- | -------- | ------ | ------ | -------- |
| C1 | FIFO vs optimised distinguishable | Two labelled cards | `MetricsCard` "FIFO Route" / "Optimized Route" | Partial (code) | `RouteComparison` |
| C2 | Selected route clear | Highlighted card | `isSelected` styling coded | Blocked by environment | code only |
| C3 | Units correct | km / min / AUD | Distance km, duration min, fuel AUD | Partial (code) | `RouteComparison` |
| C4 | Negative savings handled | Not shown as gain | `hasOptimizationBenefit = distanceSaved > 0`; savings block hidden when ≤0 | Partial (code) | `RouteComparison` L69 |
| C5 | Equal results handled | No false savings | `distanceSaved === 0` → not shown | Partial (code) | code |
| C6 | No unsupported % claim | Percentages grounded | Comparison % is computed from real metrics **BUT** static hero claims "Save up to 35%" and footnote asserts "typically 15-35% better" with no basis | Fail (doc/marketing) | `page.tsx` L73, `RouteComparison` L248 |
| C7 | Haversine vs Mapbox distinguishable | UI marks fallback | **Not distinguished** — UI never tells the user whether shown metrics are road (Mapbox) or straight-line fallback | Fail (code) | `/api/route` fallback, no UI flag |
| C8 | Heuristic not called globally optimal | Honest wording | Footnote says "not guaranteed to be absolute optimal" (good); but labelled "AI-Powered"/"AI-powered" throughout | Partial (doc) | `page.tsx`, `RouteComparison` |

### Step 5 — Location handling (all runtime cases require a browser)

| ID | Scenario | Expected | Actual | Status | Evidence |
| -- | -------- | -------- | ------ | ------ | -------- |
| L-P1 | Permission granted → position received | Driver marker, origin uses live loc | Cannot grant permission headlessly | Blocked by environment | `useDriverLocation`, code only |
| L-P2 | Map not blank after grant | Map stays painted | `DriverMapView` calls `resize()` on load + on `driverLocation` change (regression guard present) | Not tested | code only |
| L-P3 | Repeated updates → no endless calc | Guarded | Cooldown 15 s + 3 consecutive off-route + 10 s grace + `isFetchingRef` | Not tested | `DriverModeView` code |
| L-D1 | Permission denied → understandable message | Warning banner | `handlePositionError` sets message; banner coded | Blocked by environment | code only |
| L-D2 | Can continue with Monash fallback | "Skip" path | `handleStartWithoutLocation` → `startExecution()` with fallback origin | Blocked by environment | `TripPanel` code |
| L-D3 | No repeated permission prompts | One request | `requestPermission` called only on button click | Not tested | code only |
| L-U1 | Location unavailable / timeout | Handled, fallback usable | `getCurrentLocation` resolves null on timeout (6 s) | Not tested | `origin.ts` code |
| L-U2 | Unsupported geolocation | Graceful | `getCurrentLocation` returns null if `!navigator.geolocation` | Not tested | code only |
| L-PR1 | localStorage after driver location | Inspect stored coords | **Not tested** (no browser). Code: `/driver` writes coords to `saferoute_dispatch`; see Privacy note below | Not tested | `driver/page.tsx`, `tripRepository` |

**Privacy behaviour (from code, not runtime):**
- Driver coordinates **are** persisted in active dispatch state (`localStorage`
  `saferoute_dispatch`) in the `/driver` flow via `updateDriverLocation`.
- Because it is `localStorage`, closing/reopening **preserves** them until the active
  trip is cleared (`clearActiveTrip`) or completed.
- The home-page (`/`) execution flow keeps driver location only in memory
  (`TripContext`) and does **not** write it to `localStorage`.
- Console logging in the driver flow logs **rounded distances**, not raw
  latitude/longitude, so precise coordinates are not obviously printed to logs.
- (Exact coordinates are intentionally omitted from this report.)

### Step 6 — Driver execution (browser required)

| ID | Scenario | Expected | Actual | Status | Evidence |
| -- | -------- | -------- | ------ | ------ | -------- |
| D1 | Route selectable, driver mode starts | Enter execution | `startExecution` flips status; `page.tsx` renders `ExecutionView` | Blocked by environment | code only |
| D2 | Current stop shown / upcoming listed | Cards populate | `CurrentStopCard` + `UpcomingStopsDrawer` | Blocked by environment | code only |
| D3 | Stop can be completed; next becomes current | Index advances | `markStopComplete` pushes id, increments index | Partial (code) | `TripContext` |
| D4 | Cannot complete same stop twice | Guarded | `stopActionBusy` guard on `handleStopAction`; but direct `markStopComplete` button has **no re-entrancy guard** | Partial/Fail (code) | `DriverModeView` |
| D5 | Final completion ends trip | status→completed, save | `markStopComplete` completion branch + `saveCompletedTrip` | Partial (code) | `TripContext` |
| D6 | Progress consistent after refresh | State survives | Home-page flow: **lost on refresh** (in-memory only). `/driver` flow: reloads from `saferoute_dispatch` | Fail (code, home) / Partial (dispatch) | see H7 |
| D7 | Ending trip clears/preserves correctly | Clean reset | `endExecution → clearTrip` (in-memory). Dispatch flow marks completed | Partial (code) | code |
| D8 | Return to planning doesn't corrupt route | Clean state | `clearTrip` resets routes/exec/nav | Partial (code) | code |
| D9 | Upcoming-stops drawer open/close/scroll | Usable, final item reachable | Drawer list capped `max-h-52 overflow-y-auto` — scroll coded; reachability not visually confirmed | Not tested | `UpcomingStopsDrawer` |
| D10 | Panel doesn't block map controls; touch targets at mobile | Usable | Cannot measure layout | Blocked by environment | — |

### Step 8 — Responsive layouts

| ID | Viewport | Checks | Status | Evidence |
| -- | -------- | ------ | ------ | -------- |
| RL1 | Mobile 390×844 | Map/panel/scroll/drawer/touch/contrast | Blocked by environment | no browser |
| RL2 | Tablet 768×1024 | as above | Blocked by environment | no browser |
| RL3 | Desktop 1440×900 | as above | Blocked by environment | no browser |
| RL4 | Light/dark theme | Contrast, readability | Blocked by environment | no browser |

### Step 9 — Runtime errors and network behaviour

| ID | Source | Finding | Status | Evidence |
| -- | ------ | ------- | ------ | -------- |
| N1 | Next.js terminal | No compile errors, no warnings, no unhandled rejections during full API + page sweep | Pass | dev server log |
| N2 | API status codes | 200 on valid; 400 on missing origin/stops/addresses; 500 path only if Mapbox token missing | Pass | API tests |
| N3 | Repeated/failed requests | No retry storms server-side; each request single | Pass | dev log counts |
| N4 | Mapbox auth errors | Token valid → no 401/403 encountered | Pass | live 200s |
| N5 | Mapbox rate-limit | Not encountered (deliberately low volume) | Not tested | — |
| N6 | Browser console / React / hydration warnings | Cannot read browser console | Not tested | no browser |
| N7 | Unhandled promise rejections (client) | Not observable | Not tested | no browser |

---

## Historical regression results

| Historical issue | Result | Reproduction steps | Evidence | Priority |
| ---------------- | ------ | ------------------ | -------- | -------- |
| 1. Blank map after allowing location | Not testable (runtime); Not reproduced by code review | Would require granting geolocation in a browser | `DriverMapView` has `resize()` on load + on location change — regression guard present | Medium |
| 2. Route calculation continues indefinitely | Not reproduced (API); Not testable (client loop) | Ran `/api/optimize`+`/api/route` repeatedly — each returns promptly (≤700 ms) and terminates | dev log; optimise gated by `isOptimizing` | High |
| 3. Upcoming-stops drawer cannot scroll | Not testable | Requires rendered mobile viewport | `overflow-y-auto max-h-52` present | Medium |
| 4. Stop panel unusable sizing | Not testable | Requires viewport measurement | `StopList` has responsive `max-h-*` | Medium |
| 5. Map overlays cover controls | Not testable | Requires rendering | bottom-sheet `z`/`max-h` coded | Medium |
| 6. Mobile content unreachable | Not testable | Requires mobile viewport | — | Medium |
| 7. Driver view inconsistent after refresh | **Partially reproduced (by code analysis)** | Home-page flow keeps execution state only in `TripContext` (in-memory); a refresh re-runs `createEmptyTrip()` → returns to empty planner, losing the in-progress trip. `/driver` flow reloads from `localStorage` and survives. Not runtime-confirmed. | `TripContext.tsx` (`useState`, no persistence); `driver/page.tsx` reload effect | High |
| 8. Recalculation fires repeatedly from GPS/state | Not reproduced (code review); Not testable (no GPS) | Would require moving GPS fixture | Cooldown 15 s + 3-consecutive + 10 s grace + `isFetchingRef` guards in `DriverModeView` | High |

"Not reproduced" here does not prove the bug can never occur; most driver/map/layout
regressions simply could not be exercised without a browser and real geolocation.

---

## Confirmed defects

Defects below are confirmed either by real API responses or by unambiguous code review.
No fixes were implemented.

### DEF-1 — Optimise failure is silent (no user-facing error)
- **Severity:** High
- **User impact:** If `/api/optimize` or `/api/route` fails (network, Mapbox 401/429,
  server 500), `handleOptimize` only calls `console.error` and resets the spinner. The
  user sees the button return to idle with no explanation and no routes.
- **Reproduction:** Force any optimise/route request to fail (e.g. revoke token) and click
  "Optimize Route".
- **Expected:** A visible, actionable error message.
- **Actual:** Silent failure; no UI feedback.
- **Suspected root cause:** `catch (error) { console.error(...) }` with no error state.
- **Relevant files:** `src/components/trip/TripPanel.tsx` (`handleOptimize`).
- **Proposed acceptance criteria:** On optimise/route failure, an inline error is shown
  with a retry affordance; spinner resets; no uncaught rejection.

### DEF-2 — Stale routes not invalidated when stops change after calculation
- **Severity:** High
- **User impact:** After routes are generated, editing a stop's address or removing a stop
  sets `trip.status='input'` but leaves `routes.fifo`/`routes.optimized` populated
  (still referencing the old — possibly removed — stop ids). The map/comparison can show a
  route that no longer matches the current stop list until the user re-optimises.
- **Reproduction:** Optimise, then edit/remove a stop; observe routes still displayed.
- **Expected:** Editing/removing a stop clears or recomputes affected route results.
- **Actual:** `updateStop`/`removeStop` do not reset `routes` (unlike `setTripOrigin`,
  which does).
- **Suspected root cause:** `updateStop`/`removeStop` in `TripContext` omit
  `setRoutesState({fifo:null,optimized:null})`.
- **Relevant files:** `src/context/TripContext.tsx`.
- **Proposed acceptance criteria:** Any change to stop set/coordinates after calculation
  invalidates stale routes so no route referencing a removed/edited stop is shown.

### DEF-3 — Home-page driver execution state is lost on refresh
- **Severity:** High
- **User impact:** A trip started from `/` lives only in `TripContext` memory. Refreshing
  the browser during driver mode resets to the empty planner; all progress and the active
  route are lost. (The `/driver` dispatch flow is unaffected because it reloads from
  `localStorage`.)
- **Reproduction (code-level):** Start a trip on `/`, refresh; `createEmptyTrip()` yields
  `status:'input'`.
- **Expected:** Either persist in-progress execution, or clearly warn that refresh ends the
  trip.
- **Actual:** Silent loss of in-progress state.
- **Suspected root cause:** No persistence of `trip`/`executionState` for the home-page
  flow.
- **Relevant files:** `src/context/TripContext.tsx`, `src/app/page.tsx`.
- **Proposed acceptance criteria:** In-progress execution survives refresh, or the UI
  explicitly guards against accidental loss.

### DEF-4 — Fallback (Haversine) estimates are indistinguishable from Mapbox road results
- **Severity:** Medium
- **User impact:** When Mapbox Directions is unavailable, `/api/route` returns Haversine
  straight-line distance + a 40 km/h duration estimate with an empty polyline, using the
  identical response shape. The UI presents these as if they were real road metrics; the
  user cannot tell that the numbers are rough estimates (and the map would show no route
  line).
- **Reproduction:** Run with no/invalid Mapbox token; optimise; compare displayed metrics.
- **Expected:** UI indicates when values are straight-line fallbacks.
- **Actual:** No indicator; same presentation as road results.
- **Suspected root cause:** Fallback flag not propagated from `calculateFallbackRoute` to
  the client.
- **Relevant files:** `src/app/api/route/route.ts`, `src/components/results/RouteComparison.tsx`.
- **Proposed acceptance criteria:** Fallback results are visibly labelled as estimates.

### DEF-5 — Unsupported percentage / savings claims
- **Severity:** Medium (documentation / honesty)
- **User impact:** The home hero states "Save up to 35% on travel distance" and the
  comparison footnote asserts results are "typically 15-35% better than FIFO" — neither is
  substantiated and both can mislead. The optimiser is also labelled "AI-Powered", though
  it is a deterministic nearest-neighbour heuristic. (Positively, the footnote does state
  it is "not guaranteed to be absolute optimal".)
- **Reproduction:** View `/` hero and the comparison card footnote.
- **Expected:** Claims reflect the actual heuristic and per-trip computed values only.
- **Actual:** Static unsupported percentage claims + "AI" branding.
- **Relevant files:** `src/app/page.tsx` (L51, L73), `src/components/results/RouteComparison.tsx` (L248).
- **Proposed acceptance criteria:** Remove/qualify unsupported percentages; describe the
  algorithm accurately.

### DEF-6 — `optimize` rejects the valid coordinate `lat:0` / `lng:0`
- **Severity:** Low
- **User impact:** `/api/optimize` and `/api/route` reject an origin (or treat a stop as
  missing) when `lat` or `lng` is exactly `0`, due to truthiness checks (`!origin.lat`).
  Not reachable for Melbourne data, but a latent correctness bug.
- **Reproduction:** POST `/api/optimize` with `origin:{lat:0,lng:0}` → 400.
- **Expected:** Validate with type/`isNaN`/range checks (as `resolveRouteOrigin` already
  does) rather than truthiness.
- **Actual:** HTTP 400 "origin coordinates required".
- **Relevant files:** `src/app/api/optimize/route.ts`, `src/app/api/route/route.ts`.
- **Proposed acceptance criteria:** Zero-valued but valid coordinates are accepted.

### DEF-7 (candidate) — No re-entrancy guard on direct "Mark Arrived & Continue"
- **Severity:** Medium (unconfirmed at runtime)
- **User impact:** The home-page driver flow (no `onStopAction`) uses `markStopComplete`
  directly from a button with no busy/disabled guard (unlike the dispatch flow's
  `stopActionBusy`). Rapid double-tap could advance two stops. Not runtime-confirmed.
- **Relevant files:** `src/components/execution/DriverModeView.tsx`, `TripContext.markStopComplete`.
- **Proposed acceptance criteria:** Completion is idempotent against rapid repeat taps.

---

## Environment limitations

The following could not be tested in this environment and are **not** application defects:

- No browser-automation tooling is available (no Playwright/Puppeteer/browser MCP), and
  installing a testing framework is out of scope for Phase 2A. Consequently:
  - Map rendering (initial, driver, blank-map regression) — not observed.
  - Real geolocation permission (granted / denied / unavailable / unsupported) — not
    exercised; `navigator.geolocation` cannot be driven headlessly here.
  - All click/keyboard interaction (stop entry, autocomplete dropdown, route selection,
    drawer open/close/scroll, stop completion) — not exercised.
  - Responsive viewports (390×844 / 768×1024 / 1440×900), light/dark theme, touch-target
    sizing, text truncation, overlay positioning — not measured.
  - Browser console, React warnings, hydration warnings, client network panel — not read.
  - `localStorage` inspection after driver location — not performed (behaviour inferred
    from code only).
- Mapbox rate-limit behaviour was deliberately not triggered (low request volume by design).

---

## Core-release assessment

- **Can a user create a valid trip?** Partially verified. The ordering + geocoding +
  routing APIs all work with the live token; the UI wiring reads correctly, but the
  end-to-end browser journey was not executed.
- **Can FIFO and optimised routes be compared?** Yes at the data level — both are computed
  and returned with real road metrics. Presentation not visually confirmed; comparison
  cannot distinguish road vs fallback estimates (DEF-4).
- **Can location denial fall back safely?** Code path exists (Monash fallback, "Skip"),
  but not runtime-verified (Blocked by environment).
- **Can a driver complete a full route?** Logic exists and appears sound, but was not
  executed in a browser. Refresh-durability is a confirmed weakness on the home-page flow
  (DEF-3).
- **Does state survive or clear as intended?** Dispatch (`/driver`) state persists via
  `localStorage`; home-page execution state does **not** survive refresh (DEF-3).
- **Is the workflow usable at mobile size?** Not tested (Blocked by environment).
- **What currently blocks release?** From evidence gathered: silent optimise failures
  (DEF-1), stale routes after edits (DEF-2), and refresh state loss (DEF-3) are the
  functional blockers; all browser-interactive, map, geolocation, and responsive
  behaviour remains unverified and must be confirmed before release.

---

## Recommended Phase 2B scope

Smallest set of fixes to make the core journey stable (no new features):

1. **DEF-1** — Surface optimise/route failures with an inline, actionable error + retry.
2. **DEF-2** — Invalidate `routes` in `updateStop`/`removeStop` so stale/removed-stop
   routes are never displayed.
3. **DEF-3** — Make home-page in-progress execution refresh-safe (persist, or explicit
   guard).
4. **DEF-4** — Flag Haversine fallback results as estimates in the comparison UI.
5. **DEF-6** — Replace truthiness coordinate checks with type/range validation.
6. **DEF-7** — Add a re-entrancy guard to the direct stop-completion button.

Also recommended (verification, not fixes): a Phase-2B manual pass **in a real browser**
to close every "Blocked by environment" / "Not tested" row above — especially map
rendering after location grant, geolocation denial fallback, drawer scroll on mobile, and
the refresh regression (H7). DEF-5 (unsupported claims) is a documentation/honesty fix and
can be batched with copy changes.

---

# Phase 2A continuation — strict evidence re-verification (2026-07-13)

> This continuation re-runs the runtime portion of the audit under a stricter evidence
> standard. **No source code was modified and no fixes were made.** Read-only architecture
> inspection and genuine runtime testing only.

## Evidence standard applied

Every result below is tagged with exactly one of these categories, and no scenario is
marked as passing on the strength of source code alone:

- **Runtime verified** — directly executed and observed in a running application (server
  process / HTTP response).
- **API verified** — a real HTTP call was made and the response inspected.
- **Code inspected only — runtime behaviour not verified** — implementation was read but
  the behaviour was not executed.
- **Blocked by environment** — could not be exercised in this environment.
- **Not tested.**

## Re-run environment

| Field | Value |
| ----- | ----- |
| Date / timezone | 2026-07-13, AEST (UTC+10) |
| Operating system | Windows (win32 10.0.26200), PowerShell |
| Node.js version | **v22.17.1** (confirmed via `node --version`) |
| npm version | **10.9.2** (confirmed via `npm --version`) |
| Docker base image | `node:20-slim` (Node **20**) per `Dockerfile` line 14 |
| Framework | Next.js 16.2.9 (Turbopack), React 19 |
| Dev server | `npm run dev`, `http://localhost:3000`, "Ready in 1688ms" (started this session) |
| `.env.local` | Present; `NEXT_PUBLIC_MAPBOX_TOKEN` variable **name present** (value never read, printed, or exposed). Runtime status covered in the finding below. |

**Environment-version note (recorded per audit rule):** the local runtime is Node
`v22.17.1` / npm `10.9.2`, whereas the Docker build pins Node `20` (`node:20-slim`). This
is a **major-version difference**, not automatically a defect, but a compatibility point
worth verifying before relying on container parity.

## Browser availability check (mandatory, before Steps 4–9)

| Capability | Available? | Notes |
| ---------- | ---------- | ----- |
| 1. Browser that can load the local app | **No** | No browser-automation MCP/tooling present; only a GitLens MCP server is available. |
| 2. Browser dev tools / console output | **No** | Cannot read the client console. |
| 3. Network-request inspection (client) | **No** | Server-side request logs are available; the browser network panel is not. |
| 4. Viewport resizing / device emulation | **No** | Cannot measure or emulate viewports. |
| 5. Geolocation permission controls / simulation | **No** | `navigator.geolocation` cannot be driven here. |
| 6. LocalStorage inspection | **No** | Cannot read `localStorage`. |

**Consequence:** every browser-dependent scenario listed in the audit brief (page/map
rendering, autocomplete interaction, buttons/forms, loading/error states, geolocation
permission, driver-marker rendering, blank-map regression, render/calc loops, driver-mode
interaction, stop completion, drawer open/close/scroll, refresh/persistence, localStorage
inspection, responsive layouts, light/dark mode, browser console errors, network-request
repetition, keyboard navigation, touch-target usability) is recorded as
**`Blocked by environment — browser interaction unavailable`**. None were converted to a
pass via code inspection, and no browser evidence was fabricated.

## Critical runtime/environment finding — Mapbox unreachable from the Node server (TLS)

**This is an environment condition, not a confirmed SafeRoute application defect.**

- **Observed (Runtime verified):** every server-side Mapbox call failed. `/api/directions`
  returned HTTP 500; the dev-server log shows:
  `Directions API error: TypeError: fetch failed ... [cause]: Error: unable to verify the
  first certificate ... code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'`.
- **Isolation (API verified):** the same Mapbox token, called from PowerShell using the
  Windows/OS trust store, succeeded — Geocoding v5 returned `featureCount=1` and Directions
  `driving` returned `code=Ok`, `routeCount=1`, a polyline present. Plain HTTPS GETs to
  `https://api.mapbox.com/` and `https://example.com` also returned 200 from PowerShell.
- **Conclusion:** the token is valid and Mapbox is reachable; Node's `fetch` (undici) does
  not trust the intercepting/leaf certificate presented in this environment, so all
  in-server Mapbox requests fail with a TLS chain error. The project already anticipates
  this class of environment: the `Dockerfile` exposes an `INSECURE_NPM_SSL` build arg and
  `NODE_TLS_REJECT_UNAUTHORIZED=0` workaround "when a corporate proxy breaks TLS".
- **Impact on this audit:** in this runtime, only the **fallback / error** paths of
  Mapbox-backed endpoints could be exercised. The live Mapbox "happy path" through the
  Next.js server is **Blocked by environment (TLS)** here; it was API-verified only
  out-of-process (PowerShell), which does not prove the in-app rendering.

## Runtime API results (this session — API verified unless noted)

All calls were `POST http://localhost:3000<path>` with synthetic public Melbourne-area
coordinates. Exact origin/stop coordinates are intentionally not reproduced here; response
shapes are sanitized.

### `/api/optimize`

| ID | Request shape | HTTP | Response (sanitized) | Category | Note |
| -- | ------------- | ---- | -------------------- | -------- | ---- |
| O1 | origin + 2 stops w/ coords | 200 | `{orderedStopIds:[b,a], totalDistanceKm:18.9}` | API verified | nearest-neighbour ordering runs |
| O2 | stops only (no origin) | 400 | `{error:"...origin coordinates required"}` | API verified | |
| O3 | origin only (no stops) | 400 | `{error:"...stops array required"}` | API verified | |
| O4 | origin + `stops:[]` | 200 | `{orderedStopIds:[], totalDistanceKm:0}` | API verified | |
| O5 | origin + stops missing coords | 200 | `{orderedStopIds:[], totalDistanceKm:0}` | API verified | invalid stops filtered |
| O6 | origin + duplicate coords (3) | 200 | `{orderedStopIds:[c,a,b], totalDistanceKm:21.17}` | API verified | **no de-duplication** (all ids kept) |
| O7 | origin `{lat:0,lng:0}` + 1 stop | 400 | `{error:"...origin coordinates required"}` | API verified | **DEF-6 reproduced at runtime** — valid 0,0 rejected |
| O8 | origin + **16** stops | 200 | all 16 ids returned | API verified | **DEF/observation: no server-side max-stop cap** (UI-only 15 cap) |

### `/api/route`

| ID | Request shape | HTTP | Response (sanitized) | Category | Note |
| -- | ------------- | ---- | -------------------- | -------- | ---- |
| RT1 | origin + 3 stops + FIFO order | 200 | `polyline:""`, 3 legs, `totalDistanceKm:35.71`, `totalDurationMinutes:53.56` (each leg duration == distance ÷ 40 km/h × 60) | Runtime verified (fallback path) | **DEF-4 reproduced at runtime** — because Mapbox is TLS-blocked, the Haversine fallback ran and returned the **identical response shape with an empty polyline and 40 km/h estimates**, with no field distinguishing it from real road metrics. The road (Mapbox) branch was **Blocked by environment (TLS)** here. |
| RT2 | no origin | 400 | `{error:"...origin coordinates required"}` | API verified | |
| RT3 | no `orderedStopIds` | 400 | `{error:"...stops and orderedStopIds required"}` | API verified | |
| RT4 | origin + `orderedStopIds:[]` | 200 | `{polyline:"", legs:[], totalDistanceKm:0, totalDurationMinutes:0}` | API verified | |

### `/api/geocode-batch`

| ID | Request shape | HTTP | Response (sanitized) | Category | Note |
| -- | ------------- | ---- | -------------------- | -------- | ---- |
| G1 | valid address | 200 | `{results:[{success:false, error:"fetch failed"}]}` | Runtime verified (degraded) | Live geocode **Blocked by environment (TLS)**; endpoint degrades to per-address `success:false` and does **not** crash. The `"Address not found"` / `success:true` branches were **not** reached in this runtime. |
| G2 | whitespace `"   "` | 200 | `{results:[{success:false, error:"fetch failed"}]}` | Runtime verified (degraded) | Same TLS cause; not the "not found" branch. |
| G3 | nonsense string | 200 | `{results:[{success:false, error:"fetch failed"}]}` | Runtime verified (degraded) | Same. |
| G4 | body `{}` (no `addresses`) | 400 | `{error:"...addresses array required"}` | API verified | |
| G5 | `addresses:[]` | 200 | `{results:[]}` | API verified | |

**Note (candidate observation, not added to confirmed defects):** the raw fetch error
string (`"fetch failed"`) is surfaced to the client per address. This leaks a low-value
internal error message and is indistinguishable to the UI from a genuine "address not
found". Verifying the user-facing effect requires a browser (Blocked by environment).

### `/api/directions`

| ID | Request shape | HTTP | Response (sanitized) | Category | Note |
| -- | ------------- | ---- | -------------------- | -------- | ---- |
| DIR1 | valid origin + destination | 500 | `{success:false, error:"Internal server error"}` | Runtime verified | No Haversine fallback exists on this route; the TLS `fetch failed` throws and is caught as a generic 500. Confirms the architecture note that `/api/directions` has **no fallback**. Dev-log printed the stack + `UNABLE_TO_VERIFY_LEAF_SIGNATURE` cause. |
| DIR2 | non-numeric origin coords | 400 | `{success:false, error:"Invalid origin coordinates"}` | API verified | `typeof` guard works |
| DIR3 | missing destination | 400 | `{success:false, error:"Invalid destination coordinates"}` | API verified | |

### Page routes (SSR only)

`GET /`, `/driver`, `/dispatcher`, `/request`, `/dashboard`, `/settings`, `/about` each
returned **HTTP 200** with a non-trivial HTML body (20,399–35,784 bytes) and **no**
error marker. **Category: Runtime verified (SSR response only).** Client-side hydration,
rendering, and the map canvas remain **Blocked by environment — browser interaction
unavailable**.

## Strict re-classification of the earlier matrix

The earlier matrix used "Pass / Partial / Fail / Blocked / Not tested". Under the strict
standard the mapping is:

- Every **"Partial (code)" / "Partial/Fail (code)" / "(code)"** row is
  **Code inspected only — runtime behaviour not verified**. This includes: I3, I4, S4,
  V1, V2, V8, C1, C3, C4, C5, R4, R5, R8, R9, R10, R11, D3, D5, D7, D8, and the C-series
  documentation observations. The underlying code claims still stand as *code inspection*,
  but none is a runtime pass.
- Rows previously **"Pass (API)"** remain valid as **API verified** and were re-executed
  this session where applicable: V3, V4 (O4/O5), V6/V5 behaviour is now **Blocked by
  environment (TLS)** for the live-geocode branch, V7 (O6), V11 (O2/RT2), V12 (O3),
  V13 (G4), V14/DEF-6 (O7), R1 (now fallback-only, see RT1), R2/R3 (optimize + route).
- **I2, I5, S1, S2, S3, S5, S6, S7, S8, V10, R6, C2, C6, C7, C8-visual, all L-series,
  all D-series interaction, D9, D10, RL1–RL4, N6, N7** → **Blocked by environment —
  browser interaction unavailable** (not passed, not code-substituted).
- **DEF-4** is upgraded from code-inspected to **Runtime verified** by RT1 (fallback path
  observed directly).
- **DEF-6** is **Runtime verified** by O7.
- The **"no server-side maximum stops"** observation is **API verified** by O8.

Confirmed defects **DEF-1, DEF-2, DEF-3, DEF-7** remain **Code inspected only — runtime
behaviour not verified** in this environment: each requires browser interaction (a failed
optimise with visible UI, editing/removing stops after calculation, a page refresh during
driver mode, and rapid double-tap on the completion button). They are credible from code
but were **not** runtime-reproduced here and must not be counted as runtime-verified.

## Operational notes (not defects)

- **PowerShell `&&`:** chaining commands with `&&` fails in the available PowerShell
  version (shell-syntax limitation). Commands were run separately or via `;`/script files.
  This is an operational/shell note only and is **not** a SafeRoute application defect.
- **TLS interception:** as above, the Node server cannot verify the Mapbox leaf
  certificate in this environment. This blocks live Mapbox verification in-app but is an
  environment condition, not an application defect.

## Updated environment limitations (this run)

In addition to the browser limitations already documented, this run adds:

- **Live Mapbox in-app calls are blocked** by a Node TLS certificate-chain failure
  (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Only fallback (`/api/route`) and error
  (`/api/geocode-batch`, `/api/directions`) paths were runtime-observable. The live
  geocoding/directions happy path through the app is **Blocked by environment (TLS)** and
  was only confirmed out-of-process via the OS trust store.
- Consequently, C7 ("road vs fallback distinguishable") and the geocode "address not
  found" branch could not be exercised through the running app in this session.

---

# Phase 2A continuation (2) — reused server, expanded API matrix (2026-07-13, later)

> Second continuation, same day. The **existing** `npm run dev` process was reused (not
> restarted). No source code was modified; nothing was staged or committed. Evidence types
> per row: `Runtime verified — API`, `Runtime verified — server log`, `Code inspected only`,
> `Blocked by environment`, `Not tested`. Source inspection alone never yields a Pass.

## 1. Environment values (protected)

- **`.env.local`:** present. Its contents were **not** printed, copied, returned, or
  modified, and no token fragment is reproduced anywhere in this report.
- **Required variable — `NEXT_PUBLIC_MAPBOX_TOKEN`:** **Present** (name confirmed in
  `.env.local` via a name-only match; value never read). The `NEXT_PUBLIC_` prefix means it
  is **client-visible** (embedded in the browser bundle) and also read server-side in
  `src/lib/mapbox.ts`. It is referenced in both client code (`search.ts`, `MapView`,
  `DriverMapView`, `TrackingMapView`, `TripPanel`) and server code.
- **Optional variable — `MAPBOX_SECRET_TOKEN`:** documented in `.env.example` but commented
  out and not required; treated as **Missing / optional**.
- **Runtime access + live Mapbox:** **Present and runtime-verified this pass.** Live
  server-side Mapbox calls returned real data (geocode coordinates, a road polyline, and
  turn-by-turn directions), so the app can access the token and reach Mapbox — **but only
  intermittently** (see the finding in the first continuation: the same server failed all
  Mapbox calls on the prior pass). Classification: **Present and runtime-verified, with
  intermittent connectivity.** Existence of `.env.local` was **not** treated as proof of
  validity — validity was established only by observed live responses.

## 2. Reused development server

- Process **PID 5952** confirmed **alive** (`Get-Process`); not restarted.
- **Bound URL:** `http://localhost:3000`  •  **Port:** `3000`  •  Network host also bound.
- **Startup:** success — "Ready in ~1.7s" (from the server log this session).
- **Compilation errors:** none.  **Warnings:** none observed this session.
- **Runtime errors:** only the earlier intermittent Mapbox TLS 500s (first continuation);
  none in this pass.
- **Repeated logs / request loops:** none — each HTTP request appears exactly once in the
  server log; no retry storms.
- **Root HTTP check (Runtime verified — API):** `GET http://localhost:3000/` →
  **HTTP 200**, HTML returned (~30 KB), body contains `/_next/` and `<html`, i.e. it is a
  **Next.js** application response. (A 200 proves the server responds; it does **not**
  prove the browser UI renders.)

## 3. Browser-capability check (performed now)

| Capability | Available? | Evidence or limitation |
| ---------- | ---------- | ---------------------- |
| Load the local application in a real browser | **No** | No browser or browser-automation tool is exposed to the agent (only a GitLens MCP server). |
| Interact with page controls | **No** | No DOM/input channel. |
| View browser console | **No** | Cannot read client console output. |
| Inspect network requests | **No** | Only server-side request logs are available, not the browser network panel. |
| Inspect localStorage | **No** | No browser context. |
| Resize or emulate viewports | **No** | No rendering/emulation surface. |
| Control or simulate geolocation permission | **No** | `navigator.geolocation` cannot be driven here. |
| Capture screenshots | **No** | No browser/display to capture. |

**Statement:** Cursor has **no interactive-browser or browser-automation capability** in
this environment. All browser-dependent scenarios are therefore
**`Blocked by environment — no interactive browser or browser automation available`**.
Terminal HTTP requests are **not** counted as browser interaction, and browser success was
**not** inferred from compilation, API responses, HTML retrieval, or existing components.

## 4–7. Expanded API results (all `Runtime verified — API`, corroborated by server log)

Requests used synthetic/public Melbourne-area coordinates and public place names only.
No tokens, driver coordinates, or passenger data are included; returned coordinate lists
and polylines are summarized rather than reproduced.

### `/api/optimize` (POST)

| ID | Sanitised request | Status | Sanitised response | Mapbox? | Contract match | Note |
| -- | ----------------- | ------ | ------------------ | ------- | -------------- | ---- |
| OPT-01 | origin + 3 valid stops | 200 | `orderedStopIds:[c,b,a]`, `totalDistanceKm:24.41` | No | Yes | NN ordering |
| OPT-02 | no origin | 400 | `origin coordinates required` | No | Yes | |
| OPT-03 | no stops | 400 | `stops array required` | No | Yes | |
| OPT-04 | `stops:[]` | 200 | `orderedStopIds:[]`, `0` | No | Yes | empty success |
| OPT-05 | one valid stop | 200 | `[a]`, `18.63` | No | Yes | |
| OPT-06 | duplicate stop coords | 200 | `[a,b]` (both kept) | No | Yes | **no de-duplication** |
| OPT-07 | stop coords as strings `"abc"` | 200 | `[a]`, `totalDistanceKm:null` | No | **No** | **invalid coordinate types accepted → NaN→`null`** (not rejected, not filtered) |
| OPT-08 | stop coords `1e400` (→ Infinity) | 200 | `[a]`, `totalDistanceKm:null` | No | **No** | **non-finite coords accepted → `null`** |
| OPT-09a | origin `{lat:0,lng:0}` | 400 | `origin coordinates required` | No | **No** | **DEF-6: valid 0,0 origin rejected** (truthiness) |
| OPT-09b | one stop `{lat:0,lng:0}` + one valid | 200 | `[b]` (the 0,0 stop **dropped**) | No | **No** | **DEF-6: valid 0,0 stop silently removed** |
| OPT-10 | 16 stops | 200 | all 16 ids returned | No | **No cap** | **no server-side max-stop limit** |
| OPT-11 | 2 valid + 1 no-coords | 200 | `[c,a]` (invalid dropped) | No | Partial | **invalid stops silently removed** |
| OPT-12 | all invalid stops | 200 | `orderedStopIds:[]`, `0` | No | Partial | empty success for all-invalid input |

### `/api/geocode-batch` (POST) — contract `addresses:{id,address}[]`

| ID | Sanitised request | Status | Sanitised response | Mapbox? | Note |
| -- | ----------------- | ------ | ------------------ | ------- | ---- |
| GEO-01 | 2 valid public addresses | 200 | both `success:true` w/ real coords | **Yes (live OK)** | live geocode verified this pass |
| GEO-02 | `addresses:[]` | 200 | `results:[]` | No | |
| GEO-03 | body `{}` | 400 | `addresses array required` | No | |
| GEO-04 | `addresses:"..."` (string) | 400 | `addresses array required` | No | **array type enforced** |
| GEO-05 | one empty-string address | 200 | `success:false, "API error: 400"` | Yes | Mapbox rejects empty query |
| GEO-06 | whitespace-only address | 200 | `success:false, "Address not found"` | Yes | |
| GEO-07 | nonsense address | 200 | `success:false, "Address not found"` | Yes | |
| GEO-08 | duplicate address x2 | 200 | both `success:true`, identical coords | Yes | **no de-duplication** |
| GEO-09 | 20 addresses (oversized) | 200 | 20 results returned | Yes | **no max-batch-size / no length cap enforced** |

Partial-failure semantics: the endpoint returns **200** with a per-address `success` flag;
some entries can fail while others succeed. No array-length cap, no per-address length cap.

### `/api/route` (POST) — road vs fallback distinction

| ID | Sanitised request | Status | Sanitised response | Result kind | Note |
| -- | ----------------- | ------ | ------------------ | ----------- | ---- |
| RTE-01 | origin + 2 stops + order | 200 | **non-empty polyline**, legs `22.64` + `12.29` km, `34.93` km / `56.71` min | **Road (Mapbox)** | live road data verified this pass |
| RTE-02 | no origin | 400 | `origin coordinates required` | Error | |
| RTE-03 | no `orderedStopIds` | 400 | `stops and orderedStopIds required` | Error | |
| RTE-04 | origin coords as strings | 200 | `polyline:""`, legs `distanceKm:null` | **Fallback (degraded)** | **invalid coord types accepted → null metrics** (same class as OPT-07) |
| RTE-05 | `orderedStopIds:[]` | 200 | `polyline:""`, empty legs, `0` | Empty | |

**How road vs fallback is represented (Runtime verified by comparing both):** a **road**
result carries a **non-empty `polyline`** and Mapbox-derived leg durations; a **fallback**
result has **`polyline:""`** and durations exactly equal to `distanceKm ÷ 40 km/h × 60`.
There is **no explicit flag** distinguishing them — this directly confirms **DEF-4**. A
`200` alone does **not** imply Mapbox-derived data.

### `/api/directions` (POST)

| ID | Sanitised request | Status | Sanitised response | Mapbox? | Note |
| -- | ----------------- | ------ | ------------------ | ------- | ---- |
| DIR-01 | valid origin + destination | 200 | `success:true`, full geometry + turn-by-turn steps | **Yes (live OK)** | live directions verified this pass |
| DIR-02 | no origin | 400 | `Invalid origin coordinates` | No | |
| DIR-03 | no destination | 400 | `Invalid destination coordinates` | No | |
| DIR-04 | origin coords as strings | 400 | `Invalid origin coordinates` | No | **correctly rejects non-numeric coords** |

## 8. New / upgraded findings from this pass

- **Validation asymmetry (new observation, candidate defect "DEF-8"):**
  `/api/directions` correctly validates coordinates with `typeof … === 'number'` and returns
  **400** for non-numeric input (DIR-04). By contrast, `/api/optimize` and `/api/route` use
  truthiness checks (`!origin.lat`), so they **accept invalid coordinate types (strings,
  Infinity) and return HTTP 200 with `totalDistanceKm: null` / null-metric legs**
  (OPT-07, OPT-08, RTE-04) instead of rejecting them. This produces silent bad data and is
  the same root pattern as DEF-6. Evidence: `Runtime verified — API`.
- **DEF-6 upgraded to `Runtime verified — API`:** origin `0,0` rejected (OPT-09a) **and** a
  stop at `0,0` silently dropped (OPT-09b).
- **DEF-4 upgraded to `Runtime verified — API`:** having now captured **both** a live road
  response (non-empty polyline) and a fallback response (`polyline:""`, 40 km/h durations),
  the absence of any explicit fallback flag is confirmed at runtime.
- **No server-side max-stop / max-batch limit — `Runtime verified — API`:** OPT-10 (16
  stops) and GEO-09 (20 addresses) both processed fully; the 15-item limit is UI-only.
- **Silent removal of invalid stops — `Runtime verified — API`:** OPT-11 dropped the
  no-coordinate stop and returned a 200 with only the valid ids.
- **No de-duplication — `Runtime verified — API`:** OPT-06 and GEO-08 keep duplicates.
- **Mapbox connectivity is intermittent — `Runtime verified — server log`:** same server
  failed all Mapbox calls (TLS) on the first pass and succeeded on this pass.

## Confirmed API defects (from runtime API evidence)

1. **DEF-6 (Low→Medium, confirmed):** valid `0` coordinates rejected/silently dropped in
   `/api/optimize` and `/api/route` (truthiness validation). Runtime verified.
2. **DEF-8 (candidate, Medium, confirmed at API level):** `/api/optimize` and `/api/route`
   accept non-numeric / non-finite coordinates and return `200` with `null` metrics instead
   of a `400`; `/api/directions` does this correctly. Runtime verified.
3. **DEF-4 (Medium, confirmed):** road vs Haversine-fallback results are indistinguishable
   in the `/api/route` response except for an empty polyline; no explicit flag. Runtime
   verified.
4. **Missing hardening (Medium):** no server-side maximum on stops (`/api/optimize`) or
   batch size/length (`/api/geocode-batch`), and no de-duplication in either. Runtime
   verified. (Business limits are UI-only, per the original matrix.)

## Browser limitations (unchanged, restated for this pass)

Every browser-dependent scenario — page/map rendering, autocomplete interaction,
buttons/forms, loading/error states, geolocation permission (grant/deny/unavailable),
driver-marker rendering, blank-map regression, render/calc loops, driver-mode interaction,
stop completion, drawer open/close/scroll, refresh/persistence, localStorage inspection,
responsive layouts (mobile/tablet/desktop), light/dark mode, browser console errors,
client network-request repetition, keyboard navigation, touch-target usability — remains
**`Blocked by environment — no interactive browser or browser automation available`**. The
code-level confirmed defects **DEF-1, DEF-2, DEF-3, DEF-7** remain **`Code inspected only`**
until exercised in a real browser.

## Operational note (not a defect)

The PowerShell in this environment does not support `&&` command chaining (a shell-syntax
limitation). All commands were run as separate invocations or via `;`/script files. This is
an operational note only and is **not** a SafeRoute application defect.

---

# Phase 2B — Confirmed API stabilisation and verification (2026-07-14)

> Implementation phase. Only defects confirmed through Phase 2A **API runtime testing** were
> fixed. No browser-only issues were changed. The original Phase 2A evidence above is left
> intact. Branch: `fix/core-api-validation` (from `chore/release-baseline` @ `1290737`).
> Node `v22.17.1`, npm `10.9.2`; Docker base image uses Node `20` (`node:20-slim`).

## Defects addressed

| Defect | Summary | Root cause | Status |
| ------ | ------- | ---------- | ------ |
| DEF-6 | Valid `0` coordinates rejected (origin) / silently dropped (stop) | Truthiness checks (`!origin.lat`) treat `0` as missing; stop filter used `s.coordinates.lat && .lng` | **Fixed** |
| DEF-8 | Invalid/non-finite coordinate types accepted → `200` with `totalDistanceKm: null` | Truthiness checks accept strings/`Infinity`; no numeric validation | **Fixed** |
| DEF-4 | Road vs Haversine-fallback route indistinguishable | Fallback flag never propagated to the client | **Fixed (API + minimal client label)** |
| Missing limits | No server-side max stops / batch size; empty/malformed addresses not rejected; invalid stops silently removed | No server-side business validation | **Fixed** |

## Root causes confirmed

1. **Truthiness validation** in `/api/optimize` and `/api/route` (`!origin.lat`, and the
   `s.coordinates.lat && s.coordinates.lng` stop filter) both (a) rejected/dropped the valid
   value `0` and (b) accepted non-numeric / non-finite values, which then produced `NaN`
   distances serialized as `null`.
2. **No provenance field** on the `/api/route` response: a Haversine fallback used the same
   shape as a Mapbox road result, distinguishable only by an empty polyline.
3. **No server-side limits**: the 15-destination cap and geocode batch/length limits lived
   only in the UI.

## Files changed

| File | Change |
| ---- | ------ |
| `src/lib/validation.ts` (new) | Shared `isFiniteNumber` / `isValidLatitude` / `isValidLongitude` / `isValidCoordinates` helpers (finite + range, accept `0`, reject strings/null/NaN/Infinity/arrays/objects). |
| `src/lib/constants.ts` | Added `MAX_DESTINATIONS = 15` (single source of truth; `MAX_STOPS` now aliases it) and `MAX_ADDRESS_LENGTH = 250`. |
| `src/types/index.ts` | Added `RouteSource` type; `RouteResponse` now includes `routeSource` + `isFallback`; `Route` carries optional `source`. |
| `src/app/api/optimize/route.ts` | Numeric coordinate validation; validates every stop (rejects with `stopIndex`, no silent drop); enforces `MAX_DESTINATIONS`; preserves `0` and duplicates. |
| `src/app/api/route/route.ts` | Same coordinate validation + `MAX_DESTINATIONS`; returns `routeSource`/`isFallback`; never returns `200` with `null`/`NaN` metrics. |
| `src/app/api/geocode-batch/route.ts` | Validates array type, non-empty, ≤15, per-entry `{id, address}` with non-empty trimmed string ≤250 chars — all **before** any Mapbox call; preserves order + duplicates. |
| `src/app/api/directions/route.ts` | Reuses `isValidCoordinates` for origin/destination/waypoints (preserves its verified `400` behaviour, additionally rejects NaN/Infinity/out-of-range). |
| `src/components/trip/TripPanel.tsx` | Stores `routeSource` from each `/api/route` response onto the `Route`. |
| `src/components/results/RouteComparison.tsx` | Minimal, non-redesign fallback banner shown only when a route's source is `haversine-fallback`. |

**Untouched (protected):** `Dockerfile`, `docker-compose.yml`, `src/app/layout.tsx`,
`tailwind.config.js` — not edited, staged, committed, reverted, stashed, or formatted.

## Request-contract changes

- `/api/optimize`, `/api/route`: invalid coordinates now return **`400`** with
  `{ error, code, details?: { stopIndex } }` (previously accepted or produced `null`).
  Max 15 destinations enforced (`TOO_MANY_DESTINATIONS`). Origin is a separate field and is
  never counted as a destination.
- `/api/route` success responses gain **`routeSource: 'mapbox' | 'haversine-fallback' | 'none'`**
  and **`isFallback: boolean`**. Existing fields (`polyline`, `legs`, `totalDistanceKm`,
  `totalDurationMinutes`) are unchanged.
- `/api/geocode-batch`: now returns **`400`** (before calling Mapbox) for non-array,
  empty array, >15 entries, non-object entries, missing/empty id, non-string/empty/too-long
  address. **Contract note:** the real request shape is `addresses: {id, address}[]` (not a
  bare string array as the Phase 2B brief assumed); validation was implemented against the
  actual contract. Empty array now returns `400` (`EMPTY_BATCH`) rather than `200 {results:[]}`;
  the client never sends an empty batch, so no UI behaviour changes.
- Duplicate destinations/addresses are **preserved** everywhere (no dedupe added).

## Before-and-after API results (Runtime verified — API, 2026-07-14)

Server reused: `npm run dev`, `http://localhost:3000`. Mapbox was **live** during this run,
so both route sources were observed directly.

### `/api/optimize`

| Case | Before (Phase 2A) | After (Phase 2B) |
| ---- | ----------------- | ---------------- |
| Valid multi | 200 ordered | 200 ordered (unchanged) |
| Origin `lat:0,lng:0` | **400** (DEF-6) | **200 accepted** |
| Stop `lat:0,lng:0` | **silently dropped** (DEF-6) | **200, stop preserved** |
| Missing origin | 400 | 400 `INVALID_ORIGIN` |
| Missing stops | 400 | 400 `INVALID_STOPS` |
| Empty stops | 200 empty | 200 empty (unchanged) |
| One stop | 200 | 200 |
| Duplicate stops | 200 both | 200 both (preserved) |
| Numeric-string coords | **200, `null`** (DEF-8) | **400 `INVALID_COORDINATES` stopIndex 0** |
| `null` coords | 200 (dropped) | **400 stopIndex 0** |
| Latitude out of range (100) | 200 accepted | **400 stopIndex 0** |
| Longitude out of range (200) | 200 accepted | **400 stopIndex 0** |
| Mixed valid/invalid | **200, invalid dropped** | **400 stopIndex 1** (no silent drop) |
| All invalid | 200 empty | **400 stopIndex 0** |
| Exactly 15 | 200 | 200 |
| 16 stops | **200 (no cap)** | **400 `TOO_MANY_DESTINATIONS` {max:15,received:16}** |

### `/api/route`

| Case | Before | After |
| ---- | ------ | ----- |
| Valid | 200, no source field | **200 `routeSource:mapbox`, `isFallback:false`**, polyline present |
| Coord `0` (origin 0,0 → unroutable by road) | n/a | **200 `routeSource:haversine-fallback`, `isFallback:true`**, finite km (fallback correctly labelled, not called road) |
| Numeric-string coords | **200, `null`** | **400 `INVALID_ORIGIN`** |
| `null` coords | 200, `null` | **400 stopIndex 0** |
| Out-of-range coords | 200 | **400 stopIndex 0** |
| Duplicate destinations | 200 | **200 `routeSource:mapbox`** (preserved) |
| Exactly 15 | 200 | 200, 15 legs, `routeSource:mapbox` |
| 16 stops | 200 (no cap) | **400 `TOO_MANY_DESTINATIONS`** |

All successful numeric fields were finite; **no `null`/`NaN`/Infinity** distances observed.

### `/api/geocode-batch`

| Case | Before | After |
| ---- | ------ | ----- |
| Valid array | 200 | 200 (1 success) |
| Empty array | 200 `{results:[]}` | **400 `EMPTY_BATCH`** |
| Missing `addresses` | 400 | 400 `INVALID_ADDRESSES` |
| Non-array `addresses` | 400 | 400 `INVALID_ADDRESSES` |
| Empty string | 200 (Mapbox 400 per item) | **400 `EMPTY_ADDRESS` index 0** (before Mapbox) |
| Whitespace-only | 200 "Address not found" | **400 `EMPTY_ADDRESS` index 0** |
| Non-string entry | 200 (garbage query) | **400 `INVALID_ADDRESS` index 0** |
| Address > 250 chars | 200 | **400 `ADDRESS_TOO_LONG` {index:0,max:250}** |
| Duplicate addresses | 200 both | 200 both (preserved) |
| Exactly 15 | 200 | 200 (15 success) |
| 16 addresses | 200 (no cap) | **400 `TOO_MANY_ADDRESSES`** (before Mapbox) |

## Validation results

| Check | Command | Result |
| ----- | ------- | ------ |
| Lint | `npm run lint` | **Pass** — 0 errors (6 pre-existing warnings in untouched files/config; none introduced) |
| Type check | `npm run typecheck` | **Pass** — no errors |
| Production build | `npm run build` | **Pass** — compiled; all four `/api/*` routes emitted as dynamic functions |

No check was weakened. No insecure TLS setting was added.

## Client presentation

`Code implemented and build-verified — browser runtime not verified.` The fallback banner
("Straight-line estimate — road routing temporarily unavailable…") is rendered in
`RouteComparison` only when a route's `source` is `haversine-fallback`. Because Cursor has
**no interactive browser or browser automation**, its on-screen rendering was **not**
verified in a browser and is not claimed to be.

## Remaining browser-blocked scenarios (unchanged, not addressed in 2B)

`Blocked by environment — no interactive browser or browser automation available`:
silent optimise failure in the UI (DEF-1), stale route display (DEF-2), refresh-state loss
(DEF-3), double-tap stop completion (DEF-7), blank map, drawer scrolling, responsive layout,
light/dark mode, geolocation behaviour. These require browser or end-to-end evidence.

## Mapbox TLS environment limitation

Phase 2A saw intermittent `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (Node cannot verify the leaf
certificate) on server-side Mapbox calls; the 2026-07-14 run succeeded live. This is treated
as an **environment / certificate-chain limitation, not an application defect**. No TLS
verification was disabled, no `NODE_TLS_REJECT_UNAUTHORIZED=0`, no npm `strict-ssl=false`,
and the Docker TLS workaround was not modified. The app's safe Haversine fallback continues
to cover Mapbox unavailability (and is now explicitly labelled).

## Known compatibility risks

- **Node version drift:** local Node `v22` vs Docker Node `20` — unchanged by this phase;
  worth a container parity check later.
- **`/api/geocode-batch` empty-array now returns `400`** (was `200 {results:[]}`). The
  current UI never sends an empty batch, but any external caller relying on the old empty-OK
  behaviour would now receive `400`.
- **Stricter coordinate validation** may reject previously-tolerated malformed payloads from
  any non-UI API caller (by design).
