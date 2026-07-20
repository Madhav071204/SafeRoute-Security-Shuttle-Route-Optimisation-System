# SafeRoute Production Acceptance

Phase 5C evidence recorded **2026-07-20** (Australia/Sydney).

## Production URL

https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws

## Accepted commit and image digest

| Item | Value |
|------|-------|
| **Release baseline (post PR #5)** | `d2bcb961e432e6bfe4a36aaeabd3b61f573aed93` |
| **PR #5 merge** | `d2bcb961e432e6bfe4a36aaeabd3b61f573aed93` @ 2026-07-20T17:07:58+10:00 |
| **Currently serving (ECS)** | `d2bcb961e432e6bfe4a36aaeabd3b61f573aed93` @ `sha256:1beb93d7d5dbc7b4f37cd45b3372d738dfa69ac16c75c8e2cc90ff6886e5370b` |
| **Task definition** | `default-saferoute-web:5` |
| **Service revision** | `.../service-revision/default/saferoute-web/8337120743105152329` |
| **Prior bootstrap image** | `sha256:70fe0a83d577f133629b5db7a8989a7c8d11ab8498c64d58ec2f501da5cc7eb7` |

## IAM deployment-policy correction

| Field | Result |
|-------|--------|
| Policy name | `SafeRouteGitHubDeploy` (inline on `SafeRouteGitHubDeployRole`) |
| Role ARN (sanitised) | `arn:aws:iam::6908********0404:role/SafeRouteGitHubDeployRole` |
| Applied via | `deploy/aws/apply-github-deploy-policy.ps1` @ 2026-07-20 |
| Permissions added | `ecs:RegisterTaskDefinition`, `ecs:DeregisterTaskDefinition` scoped to `default-saferoute-web` task definition family |
| Trust policy | Unchanged — repo + `environment:production` + `ref:refs/heads/chore/release-baseline` only |
| Script result | **OK** |

## Automated deployment evidence

### PR #4 merge (first CD attempt)

| Field | Result |
|-------|--------|
| Workflow | [CI run 29721603128](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/runs/29721603128) |
| Commit | `c71548fbd5d9d96e67e3e1291dcee348ecede150` |
| Validate / Playwright | **success** |
| OIDC / ECR push | **success** → `sha256:88ade0420bf1a1251d7bbbd1848d813a7aa2b1e97094014f79bae045a8caa0f8` |
| ECS update | **failure** — `AccessDeniedException` on `ecs:RegisterTaskDefinition` |
| Remediation | IAM policy template + `apply-github-deploy-policy.ps1` |

### PR #5 merge (security-closure CD)

| Field | Result |
|-------|--------|
| Workflow | [CI run 29723637074](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/runs/29723637074) |
| Commit | `d2bcb961e432e6bfe4a36aaeabd3b61f573aed93` |
| Validate / Playwright | **success** |
| OIDC / ECR push | **success** → `sha256:1beb93d7d5dbc7b4f37cd45b3372d738dfa69ac16c75c8e2cc90ff6886e5370b` |
| ECS update (first attempt) | **failure** — `InvalidParameterException` on `MAPBOX_ACCESS_TOKEN` secret (trailing newline in `MAPBOX_SECRET_ARN` GitHub variable) |
| GitHub variable fix | `MAPBOX_SECRET_ARN` trimmed @ 2026-07-20 |
| ECS update (rerun) | **skipped** — immutable ECR tag already existed |
| Production deploy | Completed via `deploy/aws/rollback.ps1` (admin) to digest `1beb93d7…` |
| Follow-up | `fix/cd-deploy-rerun` — CI tolerates existing immutable tags + trims secret ARN in deploy step |

### First complete CD chain (GitHub Actions)

| Field | Result |
|-------|--------|
| Status | **Partially proven** — validate → Playwright → OIDC → ECR push confirmed on runs 29721603128 and 29723637074 |
| ECS via OIDC | Blocked by IAM (fixed), then secret ARN newline (fixed), then immutable-tag rerun (CI fix pending merge) |
| First image reaching ECS | `sha256:1beb93d7…` (PR #5 security-closure build) via operator rollback script after OIDC push |

## Health and availability evidence

Verified against **deployed** image `1beb93d7…` on 2026-07-20:

| Check | Result |
|-------|--------|
| `GET /api/health` | 200 `{"status":"ok"}` |
| `GET /` | 200 HTML |
| `POST /api/route` (3 synthetic stops) | 200 `routeSource: mapbox`, `isFallback: false` |
| TLS | Valid HTTPS |

## Browser acceptance environment

| Field | Value |
|-------|-------|
| Browser | Google Chrome (Playwright `chromium` channel) |
| Viewport | Default + 390×844 mobile |
| Network | Residential ISP; public DNS |
| Test data | Synthetic public coordinates only |

## Browser acceptance results

| Step | Result |
|------|--------|
| 1 HTTPS page loads | **Pass** |
| 2 Map tiles appear | **Not asserted** in automated smoke |
| 3 Address suggestions | **Not exercised** on production URL |
| 4 Three stops added | **Pass** (API-level route test) |
| 5 FIFO / optimised routes | **Pass** (local e2e suite; API on production) |
| 6 Mapbox road routing | **Pass** (`routeSource: mapbox`) |
| 7 Markers / route lines | **Not exercised** on production URL |
| 8 Driver mode starts | **Not exercised** on production URL |
| 9 Current / upcoming stops | **Not exercised** on production URL |
| 10 Stop completion | **Not exercised** on production URL |
| 11 Mobile 390×844 | **Pass** |
| 12 No horizontal overflow | **Pass** |
| 13 No fatal console error | **Pass** (homepage smoke) |
| 14 No request loop | **Pass** (homepage smoke) |

**Automated production smoke:** `npx playwright test --config=playwright.production.config.ts` — **3/3 passed**.

**Console / network:** No token values logged. No fatal `pageerror` events on homepage load.

## Mapbox token restrictions

| Control | Status |
|---------|--------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` browser-only | **Confirmed** in code |
| `MAPBOX_ACCESS_TOKEN` server-only | **Confirmed** — Secrets Manager in ECS |
| Server token absent from GitHub / bundles | **Confirmed** |
| Production public token URL-restricted | **Blocked — Mapbox dashboard access unavailable in this session** |
| Separate dev public token | **Documented** in `.env.example` |

### Manual Mapbox dashboard steps (production browser token)

1. Sign in to [Mapbox Account → Access tokens](https://account.mapbox.com/access-tokens/).
2. Edit the **production public** token used as `NEXT_PUBLIC_MAPBOX_TOKEN`.
3. Under **URL restrictions**, allow only:
   - `https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws/*`
4. Limit scopes to GL/styles needs (`styles:read`, `fonts:read`, etc.).
5. Create a **separate development** public token restricted to `http://localhost:3000/*`.
6. Keep the **server token** scoped to Geocoding / Directions / Routing APIs only.
7. Update GitHub `production` secret `NEXT_PUBLIC_MAPBOX_TOKEN` if the production public token changes; redeploy.

## Container vulnerability findings

### ECR before (bootstrap `70fe0a83…`)

| Severity | Count |
|----------|------:|
| Critical | 3 |
| High | 5 |
| Medium | 3 |

Representative families: Node binary CVEs (CVE-2025-55130, CVE-2026-21710, CVE-2026-21637), Debian glibc/pam.

### ECR after (PR #5 deployed `1beb93d7…`)

| Severity | Count |
|----------|------:|
| Critical | 3 |
| High | 5 |
| Medium | 3 |

Scan COMPLETE @ 2026-07-20. Counts unchanged; finding mix shifted (Debian `perl` / `util-linux` CVEs surfaced on security-closure image). `apt-get upgrade` in Dockerfile runner stage reported **0 packages** upgraded at build time.

### Residual Critical / High findings (`1beb93d7…`)

| CVE | Severity | Package | Fix exists? | In Node 22 slim? | Runtime relevance | Why it remains | Compensating control |
|-----|----------|---------|-------------|------------------|-------------------|----------------|----------------------|
| CVE-2026-13221 | Critical | perl 5.36.0 | Pending Debian | Yes (base OS) | **Low** — Perl not invoked by Node standalone server | No patched Debian package at build time | Non-root container, no shell login, single-purpose image |
| CVE-2026-12087 | Critical | perl 5.36.0 | Pending Debian | Yes | **Low** — Socket.xs not used at runtime | Same | Same |
| CVE-2026-57433 | Critical | perl 5.36.0 | Pending Debian | Yes | **Low** — Storable thaw not used | Same | Same |
| CVE-2026-48961 | High | perl 5.36.0 | IO::Compress 2.220+ | Yes | **Low** — CLI tool only | Bundled in base, not executed | Minimal attack surface |
| CVE-2026-57432 | High | perl 5.36.0 | Perl 5.43.11+ | Yes | **Low** | Base image lag | Rebuild on next slim refresh |
| CVE-2026-48962 | High | perl 5.36.0 | IO::Compress 2.220+ | Yes | **Low** | Same | Same |
| CVE-2026-7017 | High | perl 5.36.0 | HTTP::Tiny 0.095+ | Yes | **Low** | Same | Same |
| CVE-2026-48959 | High | perl 5.36.0 | IO::Uncompress 2.220+ | Yes | **Low** | Same | Same |

**Review action:** Re-scan after next `node:22-slim` refresh (target 2026-08-20). Do not add ECR ignore rules to mask findings.

## Rollback readiness

| Control | Status |
|---------|--------|
| Digest-only input (`^sha256:[a-f0-9]{64}$`) | Yes (`.github/workflows/rollback.yml`) |
| ECR repo restriction | Yes |
| OIDC (no long-lived keys) | Yes (workflow); operator script uses admin profile |
| `production` environment | Yes |
| No `latest` tag | Yes |
| ECS ACTIVE wait + `/api/health` | Yes |

**Validation performed:** No-op rollback to `sha256:1beb93d7…` via `deploy/aws/rollback.ps1` — digest validated, ECR ownership confirmed, ECS returned ACTIVE, `/api/health` 200. OIDC rollback workflow exists on `chore/release-baseline` (not yet on default branch for `workflow_dispatch`).

## Cost controls (live verification 2026-07-20)

| Control | Status |
|---------|--------|
| `SafeRoute-Monthly-Budget` | **Exists** — $5 USD monthly |
| Alert thresholds | **50% / 80% / 100%** (email alert, not hard cap) |
| CloudWatch `/ecs/saferoute-web` retention | **7 days** |
| ECR lifecycle policy | **Active** (10 tagged; untagged expire 7d) |
| ECR tag immutability | **IMMUTABLE** |
| Scan-on-push | **Enabled** |
| ECS services | **Single** `saferoute-web` |
| NAT Gateway | **None** (SafeRoute-tagged) |
| Teardown script default | **Dry-run** |

## Manual limitations

1. **Mapbox token URL restrictions** — requires Mapbox account administrator.
2. **Full production driver journey** — not run against live URL (covered by mocked local e2e).
3. **OIDC ECS deploy via Actions** — pending merge of `fix/cd-deploy-rerun` for immutable-tag reruns.
4. **Campus DNS** — Monash recursive DNS may NXDOMAIN `*.on.aws`; use public resolver.

## Production acceptance decision

**Conditionally accepted for controlled portfolio demonstration**

Evidence supports HTTPS availability, Mapbox server routing on the PR #5 security image, IAM/CD remediation, ECR push via OIDC, operator-validated rollback, and automated test baselines. **Remaining blockers before full acceptance:** Mapbox public URL restrictions, OIDC ECS deploy confirmation via Actions (after CI fix merge), and full production driver-journey browser pass.

This is **not** enterprise production-ready.
