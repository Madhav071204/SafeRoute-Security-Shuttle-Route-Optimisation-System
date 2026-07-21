# SafeRoute User Testing Plan

Phase 6A preparation document.

**Status (2026-07-21):** Formal structured user testing was **not** conducted (time constraint). The only validation outside automated tests is:

* Owner manual testing of the production application
* Informal peer sharing / informal review with friends

No structured participant tasks, timings, surveys, or feedback records were collected. Do not treat informal sharing as formal user testing.

## Objective

Evaluate whether a first-time operator and driver can complete the core workflow safely and understand the route comparison.

## Participant types

Recommend approximately three to five participants, such as:

* Student unfamiliar with SafeRoute
* Technically confident student
* Person acting as a shuttle operator
* Person acting as driver

**No participants have completed this plan yet.**

## Test environment

| Item | Detail |
|------|--------|
| URL | https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws |
| Devices | Desktop (≥1280 px) and mobile (~390×844) where possible |
| Data | Synthetic passenger names only; public destinations only |
| Scope | Proof-of-concept demonstration — not a real security-shuttle operation |

## Operator tasks

1. Add three destinations.
2. Resolve the addresses (autocomplete or geocode).
3. Compare FIFO and optimised routes.
4. Select a route.
5. Start the trip.

## Driver tasks

1. Identify the current stop.
2. Open upcoming stops.
3. Complete a stop.
4. Identify the next stop.
5. Finish the simulated trip.

## Observation metrics

Record for each task:

| Metric | Notes |
|--------|-------|
| Task completed | Yes / No / Partial |
| Time taken | mm:ss |
| Assistance required | None / Hint / Demonstration |
| Error or hesitation | Describe briefly |
| Misunderstood label | UI element if any |
| Navigation difficulty | Low / Medium / High |
| Confidence rating | 1–5 (participant self-report) |
| Participant comment | Verbatim (sanitised) |

## Post-test questions

1. How easy was it to add destinations and start a trip? (1–5)
2. Was the difference between FIFO and optimised routes clear?
3. Was driver mode easy to follow?
4. Did you trust the calculated routes?
5. Were error messages (if any) understandable?
6. What was the most confusing part?
7. What was the most useful part?
8. What would you improve?

## Safety and privacy script

Read to each participant before starting:

> SafeRoute is a personal proof-of-concept built for portfolio demonstration. It is **not** an official Monash University system. Please use **fake passenger names** and **public destinations** only. Do not enter real passenger information, security details, or live operational data. The app may store trip data in your browser after the session — please clear site data when finished.

Suggested browser cleanup: Settings → Privacy → Clear browsing data → Cached images/files + Site data for the production hostname.

## Feedback-recording template

Complete one row per session. **Do not pre-fill results.**

| Session # | Date | Participant type | Device / viewport | Operator tasks (pass/fail notes) | Driver tasks (pass/fail notes) | Confidence (1–5) | Key friction | Suggested improvement | Tester initials |
|-----------|------|------------------|-------------------|----------------------------------|--------------------------------|------------------|--------------|----------------------|-----------------|
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
