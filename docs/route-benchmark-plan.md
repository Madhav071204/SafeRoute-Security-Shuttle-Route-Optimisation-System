# SafeRoute Route Benchmark Plan

Phase 6A / portfolio preparation — scenario catalogue and measurement rules.

**Executed subset:** six scenarios (**B01–B06**) were run on 2026-07-21. Results: [`route-benchmark-results.md`](./route-benchmark-results.md). Raw JSON: [`route-benchmark-raw.json`](./route-benchmark-raw.json).

## Objective

Compare FIFO and nearest-neighbour routes using repeatable public scenarios on the production Mapbox road network.

## Scenarios

Fixed public scenarios (Melbourne / Monash Clayton area). Record input order exactly as entered.

| ID | Origin | Destinations (input order) | Stop count | Selection rationale | Portfolio run |
|----|--------|---------------------------|------------|---------------------|---------------|
| S01 | Monash University Clayton | Chadstone SC; Dandenong Plaza; Fountain Gate | 3 | Spread south-east from campus | Not run (time) |
| S02 | Monash University Clayton | Glen Waverley Station; Mount Waverley Station; Syndal Station | 3 | Clustered along one rail corridor | **B03** |
| S03 | Federation Square | Flinders St Station; Southern Cross; Parliament Station | 3 | CBD cluster, short hops | Not run (time) |
| S04 | Monash University Clayton | Brighton Beach; Frankston Station; Dandenong Plaza | 3 | Wide spread + one distant outlier (Brighton) | **B05** |
| S05 | Monash University Clayton | Chadstone SC; Chadstone SC; Glen Waverley Station | 3 | Duplicate destination | **B06** |
| S06 | Monash University Clayton | Glen Waverley; Mount Waverley; Syndal; Clayton Station; Oakleigh | 5 | Medium count, ring around origin | **B04** |
| S07 | Monash University Clayton | Dandenong; Pakenham; Cranbourne; Berwick; Narre Warren | 5 | One-direction south-east chain | Not run (time) |
| S08 | Monash University Clayton | Syndal; Glen Waverley; Mount Waverley; Clayton; Oakleigh; Huntingdale | 6 | Already near-efficient FIFO order | **B01** |
| S09 | Monash University Clayton | Huntingdale; Oakleigh; Clayton; Mount Waverley; Glen Waverley; Syndal | 6 | Intentionally poor FIFO order | **B02** |
| S10 | Monash University Clayton | Chadstone; Glen Waverley; Mount Waverley; Syndal; Oakleigh; Clayton; Huntingdale; Dandenong; Pakenham | 9 | Larger stop count | Not run (time) |
| S11 | Southern Cross Station | Docklands; Marvel Stadium; Queen Victoria Market; Melbourne Central | 4 | CBD west loop | Not run (time) |
| S12 | Monash University Clayton | Monash Medical Centre; Clayton Station; Huntingdale Station | 3 | Short local shuttle pattern | Not run (time) |

## Measurements

For each scenario record:

| Field | Description |
|-------|-------------|
| FIFO distance | km from route metrics |
| Nearest-neighbour distance | km from optimised route metrics |
| FIFO duration | minutes |
| Nearest-neighbour duration | minutes |
| Absolute distance difference | FIFO − NN (km) |
| Percentage distance difference | `((FIFO − NN) / FIFO) × 100` |
| Absolute duration difference | FIFO − NN (min) |
| Percentage duration difference | `((FIFO − NN) / FIFO) × 100` |
| Route source | `mapbox` or `haversine-fallback` |
| Timestamp | ISO 8601 |
| Unexpected result or failure | Free text |

## Interpretation rules

* Nearest neighbour is a **heuristic**, not a proven global optimum.
* Report negative improvements when nearest neighbour performs worse.
* Report equal results when metrics match.
* Distinguish Mapbox road-network results from Haversine fallback.
* Do not estimate fuel savings without a defensible vehicle model.
* Do not generalise beyond the tested scenarios.
* Preserve raw observations; do not round away small differences.

## Result template

See [`route-benchmark-results.md`](./route-benchmark-results.md) for completed B01–B06 tables. Remaining S01–S12 catalogue entries may be filled in a later controlled session.

**Do not execute bulk automated Mapbox requests from CI.** Run scenarios manually or in a controlled local session (`scripts/run-route-benchmark.mjs`).
