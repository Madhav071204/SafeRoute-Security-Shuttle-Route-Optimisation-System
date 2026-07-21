# SafeRoute Route Benchmark Results

Recorded **2026-07-21** (Australia/Sydney) against the live production deployment.

## Objective

Compare FIFO ordering with nearest-neighbour ordering on Mapbox road-network distance and duration for six fixed public Melbourne scenarios. This is an illustrative check, not a scientific operational study.

## Method

1. Use a consistent origin: **Monash University Clayton** (`-37.9105`, `145.1363`).
2. Build each scenario from fixed, publicly verifiable landmark coordinates (synthetic passenger labels only; no real passenger data).
3. Call production `POST /api/optimize` for nearest-neighbour stop order (Haversine-based ordering).
4. Call production `POST /api/route` twice per scenario (FIFO order and nearest-neighbour order) to obtain Mapbox Directions road metrics.
5. Accept a result only when `routeSource === "mapbox"` and `isFallback === false`.
6. If Mapbox fallback occurs, wait ~4 seconds and retry once; if still fallback, mark the scenario unavailable.
7. Pace requests (~0.8–1.5 s between calls) to avoid excessive Mapbox usage.

**Percentage difference formula** (FIFO as baseline):

```text
percentageDifference = ((FIFO − nearestNeighbour) / FIFO) × 100
```

- Positive values mean nearest neighbour was shorter/faster than FIFO.
- Negative values mean nearest neighbour was longer/slower than FIFO.
- Zero means equal.

Nearest neighbour is a **heuristic**. It does **not** guarantee a globally optimal route.

### Coordinate note

Abbreviated Mapbox Geocoding queries such as `Syndal Station VIC` were observed resolving to incorrect Australian matches (inflating road distance into hundreds of kilometres). This benchmark therefore uses fixed public landmark coordinates so results reflect road routing and ordering, not geocoding ambiguity. Raw JSON retains the coordinates used.

## Test environment

| Item | Value |
|------|-------|
| Production URL | https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws |
| Serving image (latest green deploy) | `sha256:c7f7a2580a5ef38a177da51410c0a52e484df5dc16538b5d23f47b75284fc82c` (tag `521e716…`) |
| Health | `GET /api/health` → `{"status":"ok"}` |
| Route source required | `mapbox` only (Haversine fallback excluded from evidence) |
| Runner | Controlled local session via `scripts/run-route-benchmark.mjs` |
| Raw archive | `docs/route-benchmark-raw.json` |

## Scenarios

| ID | Plan ID | Rationale | Stops | Destinations (input order) |
|----|---------|-----------|------:|----------------------------|
| B01 | S08 | Already near-efficient FIFO corridor order | 6 | Syndal → Glen Waverley → Mount Waverley → Clayton → Oakleigh → Huntingdale |
| B02 | S09 | Intentionally inefficient FIFO order | 6 | Huntingdale → Oakleigh → Clayton → Mount Waverley → Glen Waverley → Syndal |
| B03 | S02 | Clustered destinations along one corridor | 3 | Glen Waverley → Mount Waverley → Syndal |
| B04 | S06 | Destinations distributed around the origin | 5 | Glen Waverley → Mount Waverley → Syndal → Clayton → Oakleigh |
| B05 | S04 | One distant outlier | 3 | Brighton Beach → Frankston → Dandenong Plaza |
| B06 | S05 | Duplicate destinations (separate passengers) | 3 | Chadstone → Chadstone → Glen Waverley |

## Raw results

All six scenarios returned Mapbox road results (no fallback; no unavailable scenarios).

| Scenario | Stops | FIFO km | NN km | Δ km | Δ km % | FIFO min | NN min | Δ min | Δ min % | Source | Timestamp (UTC) | Notes |
|----------|------:|--------:|------:|-----:|-------:|---------:|-------:|------:|--------:|--------|-----------------|-------|
| B01 | 6 | 27.08 | 21.53 | 5.55 | 20.49 | 64.43 | 57.39 | 7.04 | 10.93 | mapbox | 2026-07-21T01:54:16Z | |
| B02 | 6 | 25.21 | 21.53 | 3.68 | 14.60 | 62.73 | 57.39 | 5.34 | 8.51 | mapbox | 2026-07-21T01:54:21Z | |
| B03 | 3 | 14.24 | 11.60 | 2.64 | 18.54 | 31.85 | 29.04 | 2.81 | 8.82 | mapbox | 2026-07-21T01:54:24Z | |
| B04 | 5 | 28.02 | 21.50 | 6.52 | 23.27 | 61.55 | 51.97 | 9.58 | 15.56 | mapbox | 2026-07-21T01:54:28Z | |
| B05 | 3 | 78.07 | 72.54 | 5.53 | 7.08 | 94.32 | 81.66 | 12.66 | 13.42 | mapbox | 2026-07-21T01:54:32Z | |
| B06 | 3 | 16.66 | 16.52 | 0.14 | 0.84 | 29.76 | 31.33 | −1.57 | −5.28 | mapbox | 2026-07-21T01:54:36Z | Distance nearly equal; **duration worse** for NN |

## Summary statistics

Descriptive only — **n = 6**. Do not generalise beyond these scenarios.

| Metric | Value |
|--------|-------|
| Scenarios with shorter NN distance | 6 |
| Scenarios with equal distance | 0 |
| Scenarios with longer NN distance | 0 |
| Scenarios with shorter NN duration | 5 |
| Scenarios with equal duration | 0 |
| Scenarios with longer NN duration | 1 (B06) |
| Median percentage distance difference | **16.57%** (range **0.84% … 23.27%**) |
| Median percentage duration difference | **9.88%** (range **−5.28% … 15.56%**) |

Median percentage distance difference is the median of `{20.49, 14.60, 18.54, 23.27, 7.08, 0.84}` = average of the 3rd and 4th ordered values `(14.60 + 18.54) / 2`.

## Interpretation

- Nearest neighbour is a greedy heuristic. Its order depends on the origin and the initial stop distribution.
- Ordering uses Haversine (straight-line) distances; displayed metrics use Mapbox road distance and duration. A Haversine-preferred order can still lose on road duration (see B06).
- Corridor-labelled “efficient” FIFO (B01) still improved under nearest neighbour because the FIFO list did not start at the stop closest to campus.
- These six runs are illustrative evidence that reordering can change road metrics in either direction on duration, and improved distance in this sample. They are **not** proof of typical operational savings, fuel reduction, or global optimality.

## Limitations

- Sample size of six scenarios in one metropolitan area.
- Fixed landmark coordinates; live geocoding ambiguity excluded by design after incorrect matches were observed.
- No traffic-aware optimisation in the ordering step (Directions may use live traffic for duration, but stop order does not).
- No fuel, emissions, or cost model.
- No formal structured user testing accompanies this benchmark.
- AWS production may later be taken down for cost control; reproduce locally or against a restored deployment if needed.

## Reproduction

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'   # only if local Node TLS interception blocks certs
node scripts/run-route-benchmark.mjs
```

Do **not** run bulk Mapbox benchmarks from CI.
