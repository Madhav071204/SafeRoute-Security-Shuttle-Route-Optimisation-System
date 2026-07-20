# SafeRoute Production Acceptance

Phase 5B evidence recorded **2026-07-20** (Australia/Sydney).

## Production URL

https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws

## Accepted commit and image digest

| Item | Value |
|------|-------|
| **Release baseline (post PR #4)** | `c71548fbd5d9d96e67e3e1291dcee348ecede150` |
| **PR #4 merge** | `c71548fbd5d9d96e67e3e1291dcee348ecede150` @ 2026-07-20T06:24:33+10:00 |
| **Currently serving (ECS not yet updated by CD)** | `e0dd4a2a86b72e532ae61538ce4974f9e2f4d059` @ `sha256:70fe0a83d577f133629b5db7a8989a7c8d11ab8498c64d58ec2f501da5cc7eb7` |
| **CD-built image (pushed, not deployed)** | tag `c71548fbd5d9d96e67e3e1291dcee348ecede150` @ `sha256:88ade0420bf1a1251d7bbbd1848d813a7aa2b1e97094014f79bae045a8caa0f8` |
| **Security-closure branch (pending merge)** | `fix/production-security-closure` @ `0927b36` (Dockerfile OS patch + IAM/CD controls) |

## Automated deployment evidence

### PR #4 merge

| Field | Result |
|-------|--------|
| PR | [#4](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/pull/4) merged into `chore/release-baseline` |
| Merge commit | `c71548fbd5d9d96e67e3e1291dcee348ecede150` |
| Included commits | `1336ecf` (AWS assets), `45c5b3f` (OIDC CD), `3a27363` (docs) |
| Review | No blocking review comments; CI green on PR |

### First complete CD workflow run

| Field | Result |
|-------|--------|
| Workflow | [CI run 29721603128](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/runs/29721603128) |
| Trigger | Push to `chore/release-baseline` (PR #4 merge) |
| Commit | `c71548fbd5d9d96e67e3e1291dcee348ecede150` |
| Lint • Typecheck • Test • Build | **success** (53s) |
| Browser tests (Playwright) | **success** (17 tests, 1m53s) |
| Deploy to AWS (OIDC) | **failure** at *Update ECS Express Mode service* |
| OIDC authentication | **success** (`Configure AWS credentials` step) |
| Docker build + ECR push | **success** |
| Root cause | `AccessDeniedException`: `SafeRouteGitHubDeployRole` missing `ecs:RegisterTaskDefinition` on `default-saferoute-web` task definition |
| Remediation | `deploy/aws/policies/github-deploy.json.template` updated; apply with `deploy/aws/apply-github-deploy-policy.ps1` after `aws login` |

**Important:** A skipped deploy job is **not** success. The deploy job ran but failed before ECS update.

## Health and availability evidence

Verified against the **currently serving** image (`70fe0a83…`) on 2026-07-20:

| Check | Result |
|-------|--------|
| `GET /api/health` | 200 `{"status":"ok"}` |
| `GET /` | 200 HTML (~27 KB) |
| `POST /api/optimize` (3 synthetic stops) | 200 ordered route |
| `POST /api/route` (synthetic) | 200 `routeSource: mapbox`, `isFallback: false` |
| TLS | Valid HTTPS (no browser certificate warning in Playwright navigation) |

## Browser acceptance environment

| Field | Value |
|-------|-------|
| Browser | Google Chrome (Playwright `chrome` channel) |
| Viewport | 393×727 default (Pixel 5 profile); 390×844 for overflow test |
| Network | Residential ISP; public DNS (8.8.8.8 resolves `*.on.aws`) |
| Test data | Synthetic public Melbourne-area coordinates only |

## Browser acceptance results

| Step | Result |
|------|--------|
| 1 HTTPS page loads | **Pass** |
| 2 No certificate warning | **Pass** (page navigation) |
| 3 Navigation renders | **Pass** |
| 4 Map container renders | **Pass** (homepage smoke; map visible in trip planner context) |
| 5 Map tiles load | **Not fully exercised** in automated smoke (no tile assertion) |
| 6 Address autocomplete | **Not exercised** (requires live Mapbox GL interaction suite) |
| 7 Three synthetic destinations | **Pass** (API-level) |
| 8 FIFO / optimised routes | **Pass** (optimise API) |
| 9 Mapbox road routing | **Pass** (`routeSource: mapbox`) |
| 10 Route lines / markers | **Not exercised** in production Playwright smoke |
| 11 Driver mode starts | **Not exercised** on production URL |
| 12 Current / upcoming stops | **Not exercised** on production URL |
| 13 Stop completion | **Not exercised** on production URL |
| 14 Mobile 390×844 | **Pass** (no horizontal overflow) |
| 15 No horizontal overflow | **Pass** |
| 16 No fatal console error | **Pass** (homepage smoke) |
| 17 No request loop | **Pass** (homepage smoke) |

**Automated production smoke:** `npx playwright test --config=playwright.production.config.ts` — **3/3 passed** locally.

**Console / network:** No token values logged. No fatal `pageerror` events on homepage load.

## Mapbox token restrictions

| Control | Status |
|---------|--------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` browser-only | **Confirmed** in code (`DriverMapView`, `MapView`, `TrackingMapView`) |
| `MAPBOX_ACCESS_TOKEN` server-only | **Confirmed** (`src/lib/mapbox.ts`; injected via Secrets Manager in ECS) |
| Server token absent from GitHub / source / bundles | **Confirmed** |
| Production public token URL-restricted | **Blocked — Mapbox dashboard access unavailable in this session** |
| Separate dev public token | **Documented** in `.env.example`; not verifiable here |

### Manual Mapbox dashboard steps (production browser token)

1. Sign in to [Mapbox Account → Access tokens](https://account.mapbox.com/access-tokens/).
2. Create or edit the **production public** token used as `NEXT_PUBLIC_MAPBOX_TOKEN`.
3. Under **URL restrictions**, allow only:
   - `https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws/*`
4. Limit scopes to GL/styles needs (`styles:read`, `fonts:read`, etc.).
5. Create a **separate development** public token restricted to `http://localhost:3000/*` and the Playwright origin if needed.
6. Keep the **server token** scoped to Geocoding / Directions / Routing APIs only.
7. Update GitHub `production` environment secret `NEXT_PUBLIC_MAPBOX_TOKEN` if the production public token changes; redeploy.

## Container vulnerability findings

### ECR (deployed image `70fe0a83…`)

| Severity | Count |
|----------|------:|
| Critical | 3 |
| High | 5 |
| Medium | 3 |

Source: `docs/aws-first-deployment.md` (scan COMPLETE at first bootstrap).

### npm audit (2026-07-20, `chore/release-baseline`)

| Scope | Critical | High | Moderate |
|-------|:--------:|:----:|:--------:|
| `npm audit --omit=dev` | 0 | 0 | 2 |
| `npm audit` (full) | 0 | 0 | 2 |

Both moderate findings: **postcss** via `next` nested dependency (GHSA-qx2v-qp2m-jg93). Fix requires `npm audit fix --force` → Next 9 downgrade — **not applied**.

### Representative Critical / High ECR findings (base image family)

| ID | Severity | Package | Ecosystem | Notes |
|----|----------|---------|-----------|-------|
| CVE-2025-55130 | Critical | node binary | Node | Fixed in Node ≥22.22.0; base may lag scanner metadata |
| CVE-2025-4802 | High | glibc | OS (Debian bookworm) | Fixed in `2.36-9+deb12u11`; `apt-get upgrade` on latest slim reported **0 upgrades** |
| CVE-2025-6020 | High | pam | OS | Debian security repo; same — no pending upgrades at build time |
| CVE-2026-21710 | High | node binary | Node | DoS via headers; fixed Node 22.22.2+; verify scanner DB lag |
| CVE-2026-21637 | High | node binary | Node | TLS SNI DoS; fixed in March 2026 Node security release |

Runtime relevance: Node/http/TLS CVEs affect the container PID 1 process serving HTTP. OS libc/pam CVEs are lower reachability in a minimal non-interactive Node slim image without shell login. npm transitive CVEs are build-time postcss in Next, not a runtime server dependency in the standalone output.

## Vulnerabilities remediated

| Action | Result |
|--------|--------|
| Pull latest `node:22-slim` (`sha256:6c74791…`) | Already current at CD build |
| `apt-get upgrade` in Docker runner stage | Added in `fix/production-security-closure`; **0 packages** upgraded at build time |
| npm dependency patch | No safe non-breaking fix for postcss without major downgrade |
| CD image pushed | New digest `88ade042…` (not yet deployed) |

## Residual risks

| Finding | Why it remains | Compensating controls | Review |
|---------|----------------|----------------------|--------|
| ECR Critical/High (base Node + Debian) | Latest slim had no OS upgrades; Node scanner/fix lag possible | Non-root container, single Express service, TLS, no shell exposure, budget alerts | 2026-08-20 |
| postcss moderate (npm) | Requires breaking Next downgrade | Not in standalone runtime path for API serving | Next minor upgrade track |
| CD IAM gap | `RegisterTaskDefinition` missing until policy applied | Manual bootstrap policy apply script | After `apply-github-deploy-policy.ps1` |
| Mapbox public token unrestricted | Dashboard access blocked | Server token remains secret; HTTPS-only production host | After Mapbox admin access |
| Partial production browser coverage | Full driver journey not run against live URL | 17-test mocked CI suite + API production checks | After CD deploy succeeds |

## Rollback readiness

Workflow `.github/workflows/rollback.yml` verified by inspection:

| Control | Status |
|---------|--------|
| Digest-only input (`^sha256:[a-f0-9]{64}$`) | Yes |
| ECR repo restriction | Yes (`describe-images` on `saferoute`) |
| OIDC (no long-lived keys) | Yes |
| `production` environment | Yes |
| No `latest` tag | Yes |
| ECS ACTIVE wait + `/api/health` | Yes |
| Arbitrary registry blocked | Yes |

**Validation performed:** static workflow review + digest regex confirmation. **Not run:** live rollback workflow (would churn ECS; blocked until IAM policy applied). Safe local alternative documented in `deploy/aws/rollback.ps1`.

## Cost controls

From `docs/aws-first-deployment.md` and bootstrap design (live AWS verification blocked — admin session expired):

| Control | Expected state |
|---------|----------------|
| `SafeRoute-Monthly-Budget` | $5 USD monthly |
| Alert thresholds | 50% / 80% / 100% (email alert, not hard cap) |
| CloudWatch `/ecs/saferoute-web` retention | 7 days |
| ECR lifecycle | Active (10 tagged images; untagged expire 7d) |
| ECS services | Single `saferoute-web` |
| NAT Gateway / custom VPC | Not created |
| Teardown script default | Dry-run |

## Manual limitations

1. **AWS admin session expired** — `aws login --profile saferoute-admin` required before `apply-github-deploy-policy.ps1` or live cost/ECR verification.
2. **Mapbox token URL restrictions** — requires Mapbox account administrator.
3. **First CD ECS update** — blocked on IAM policy apply, then re-run [workflow 29721603128](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/runs/29721603128) deploy job or push to `chore/release-baseline`.
4. **Local Docker build** — `npm ci` failed twice inside Docker Desktop (npm internal error); CI Docker build succeeded on GitHub-hosted runners.
5. **Campus DNS** — Monash recursive DNS may NXDOMAIN `*.on.aws`; use public resolver or GitHub-hosted smoke.

## Production acceptance decision

**Conditionally accepted for controlled portfolio demonstration**

Evidence supports HTTPS availability, Mapbox server routing, OIDC CD through ECR push, and automated test baselines. **Blockers before calling CD complete:** apply IAM deploy policy, successful ECS update + health verification on digest `88ade042…` (or newer security-closure build), Mapbox public URL restrictions, and full production driver-journey browser pass.

This is **not** enterprise production-ready.
