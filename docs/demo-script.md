# SafeRoute Demonstration Script

Target length: **about three to five minutes**. Synthetic public destinations only. Speak plainly — no memorised marketing claims.

## 1. Problem introduction (~30–40 s)

- SafeRoute is a **personal proof-of-concept**, inspired by security-shuttle drop-offs.
- It is **not** an official Monash system.
- Operators often drop passengers in **boarding order (FIFO)**, which can cause backtracking.
- The demo compares FIFO with a **nearest-neighbour** reorder and shows a **driver** flow on AWS.

Open: production URL (or local if AWS is offline).

## 2. Enter destinations (~40–50 s)

- Add three public places (for example Federation Square, Flinders Street Station, Melbourne Central).
- Use autocomplete; confirm “Location selected”.
- Mention: data is synthetic; the app may persist trips in **browser localStorage**.

## 3. Compare FIFO and optimised routes (~40–50 s)

- Run **Optimize route**.
- Point to distance and duration for **FIFO** vs **Optimized**.
- Note when values are equal or when one side is worse — do not hide that.
- Confirm Mapbox road routing (no “straight-line estimate” banner for this happy path).
- Show the map polyline and markers.

## 4. Explain the heuristic (~30–40 s)

- Ordering: start at the origin; repeatedly pick the closest remaining stop (**Haversine**).
- Complexity roughly **O(n²)**; capped at **15** stops.
- **Not** a guaranteed global optimum.
- Road metrics come from Mapbox Directions; order decisions used straight-line distance, so road duration can disagree.

## 5. Start driver mode (~20–30 s)

- Select a route → **Start trip**.
- Skip live location if prompting (campus/demo constraint).
- Show **Driver mode**, current stop, and upcoming stops.

## 6. Complete a stop (~20–30 s)

- **Mark arrived & continue** once or twice.
- Optionally finish the trip and show **Trip complete**.

## 7. Show testing evidence (~20–30 s)

- Mention verified counts: **89** Vitest, **17** local Playwright, **5** production Playwright.
- CI runs lint, typecheck, tests, build, Playwright, and OIDC deploy on the release branch.

## 8. Show AWS architecture (~20–30 s)

- Brief path: GitHub Actions OIDC → ECR immutable image → ECS Express → health gate → CloudWatch; digest rollback available.
- Optional: open [`docs/architecture-diagrams.md`](./architecture-diagrams.md) if screen-sharing docs.

## 9. Close with limitations and lessons (~30–40 s)

- No auth, no central database, localStorage persistence.
- Heuristic only; small six-scenario benchmark; one scenario had **worse duration**.
- **No formal structured user testing** — owner checks and informal peer sharing only.
- Residual base-image CVEs documented; AWS may be taken down for cost.
- Lesson: honest metrics and failure modes matter more than a single savings percentage.

## Optional if asked

- Benchmark median distance difference and range → [`route-benchmark-results.md`](./route-benchmark-results.md)
- Case study detail → [`portfolio-case-study.md`](./portfolio-case-study.md)
