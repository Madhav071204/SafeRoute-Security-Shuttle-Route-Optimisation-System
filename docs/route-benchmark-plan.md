# SafeRoute Route Benchmark Plan

Phase 6A preparation document — **no benchmark figures recorded yet**.

## Objective

Compare FIFO and nearest-neighbour routes using repeatable public scenarios on the production Mapbox road network.

## Scenarios

Fixed public scenarios (Melbourne / Monash Clayton area). Record input order exactly as entered.

| ID | Origin | Destinations (input order) | Stop count | Selection rationale |
|----|--------|---------------------------|------------|---------------------|
| S01 | Monash University Clayton | Chadstone SC; Dandenong Plaza; Fountain Gate | 3 | Spread south-east from campus |
| S02 | Monash University Clayton | Glen Waverley Station; Mount Waverley Station; Syndal Station | 3 | Clustered along one rail corridor |
| S03 | Federation Square | Flinders St Station; Southern Cross; Parliament Station | 3 | CBD cluster, short hops |
| S04 | Monash University Clayton | Brighton Beach; Frankston Station; Dandenong Plaza | 3 | Wide spread + one distant outlier (Brighton) |
| S05 | Monash University Clayton | Chadstone SC; Chadstone SC; Glen Waverley Station | 3 | Duplicate destination |
| S06 | Monash University Clayton | Glen Waverley; Mount Waverley; Syndal; Clayton Station; Oakleigh | 5 | Medium count, ring around origin |
| S07 | Monash University Clayton | Dandenong; Pakenham; Cranbourne; Berwick; Narre Warren | 5 | One-direction south-east chain |
| S08 | Monash University Clayton | Syndal; Glen Waverley; Mount Waverley; Clayton; Oakleigh; Huntingdale | 6 | Already near-efficient FIFO order |
| S09 | Monash University Clayton | Huntingdale; Oakleigh; Clayton; Mount Waverley; Glen Waverley; Syndal | 6 | Intentionally poor FIFO order |
| S10 | Monash University Clayton | Chadstone; Glen Waverley; Mount Waverley; Syndal; Oakleigh; Clayton; Huntingdale; Dandenong; Pakenham | 9 | Larger stop count |
| S11 | Southern Cross Station | Docklands; Marvel Stadium; Queen Victoria Market; Melbourne Central | 4 | CBD west loop |
| S12 | Monash University Clayton | Monash Medical Centre; Clayton Station; Huntingdale Station | 3 | Short local shuttle pattern |

## Measurements

For each scenario record:

| Field | Description |
|-------|-------------|
| FIFO distance | km from route metrics |
| Nearest-neighbour distance | km from optimised route metrics |
| FIFO duration | minutes |
| Nearest-neighbour duration | minutes |
| Absolute distance difference | FIFO − NN (km) |
| Percentage distance difference | vs FIFO baseline |
| Absolute duration difference | FIFO − NN (min) |
| Percentage duration difference | vs FIFO baseline |
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

### Raw results (empty)

| Scenario | FIFO km | NN km | Δ km | Δ km % | FIFO min | NN min | Δ min | Δ min % | Source | Timestamp | Notes |
|----------|---------|-------|------|--------|----------|--------|-------|---------|--------|-----------|-------|
| S01 | | | | | | | | | | | |
| S02 | | | | | | | | | | | |
| S03 | | | | | | | | | | | |
| S04 | | | | | | | | | | | |
| S05 | | | | | | | | | | | |
| S06 | | | | | | | | | | | |
| S07 | | | | | | | | | | | |
| S08 | | | | | | | | | | | |
| S09 | | | | | | | | | | | |
| S10 | | | | | | | | | | | |
| S11 | | | | | | | | | | | |
| S12 | | | | | | | | | | | |

### Analysis template (complete after data collection)

1. **Scenarios where NN improved distance:** (list IDs)
2. **Scenarios where NN matched FIFO:** (list IDs)
3. **Scenarios where NN was worse:** (list IDs)
4. **Fallback routes observed:** (list IDs + reason)
5. **Failures / anomalies:** (describe)
6. **Limitations:** (e.g. single region, heuristic only, no traffic model)

**Do not execute bulk automated Mapbox requests from CI.** Run scenarios manually or in a controlled local session.
