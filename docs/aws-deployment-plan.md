# SafeRoute AWS Deployment Plan

Implementation-ready design for a first public HTTPS portfolio deployment.
**Phase 5 has provisioned the first production stack.** See
`docs/aws-first-deployment.md` for the live URL, digests, and operational
procedures. This plan remains the architectural reference.

## Objective

Deploy the hardened SafeRoute production container to a public HTTPS endpoint
using GitHub Actions OIDC → Amazon ECR → Amazon ECS Express Mode, with
CloudWatch logs/metrics — while keeping the architecture **stateless** (browser
`localStorage` only; no production database).

## Proposed architecture

```text
GitHub Actions (OIDC)
        ↓
   Amazon ECR  (immutable image tags)
        ↓
 ECS Express Mode service
        ↓
 Public HTTPS SafeRoute URL
        ↓
 CloudWatch logs + basic metrics
```

No custom VPC, NAT Gateway, CloudFront, Route 53, or custom domain unless a
later demonstrated requirement appears.

## Why ECS Express Mode

* Matches a single-container, stateless Next.js standalone image.
* Provides a managed public HTTPS endpoint with less control-plane surface than
  hand-rolled ALB + ECS service wiring.
* Fits a short interview / portfolio lifespan with a clear teardown story.
* Avoids Kubernetes operational cost for this application size.

## Resources required

| Resource | Proposed value | Notes |
|----------|----------------|-------|
| Region | **ap-southeast-2** (Sydney) | Matches Monash/AU portfolio context and Mapbox AU bias; pick one region and keep all resources there |
| ECR repository | `saferoute` | Account-local name; immutable tags preferred |
| ECS Express Mode service | `saferoute-web` | One service, one container |
| Container port | `3000` | Matches Dockerfile `EXPOSE` / `PORT` |
| Health check path | `/api/health` | JSON `{ "status": "ok" }`, no upstream deps |
| CPU / memory (start) | 0.25 vCPU / 0.5 GB | Minimal viable for Next standalone; raise only if evidence requires |
| Desired tasks | min 1 / max 1 initially | Avoid idle duplicate services for cost |
| Deployment timeout | 10–15 minutes | Fail closed rather than hanging |
| Log group | `/ecs/saferoute-web` | Retention **7–14 days** for portfolio |
| Public HTTPS | Express Mode provided URL | No custom domain in phase 1 deploy |

## Image and release strategy

* Tag every CI-built image with the **full git commit SHA** (`saferoute:<sha>`).
* Optionally add a human-readable promotion tag (`saferoute:release-YYYYMMDD`)
  that still points at a digest recorded in the deployment log.
* **Do not** rely on mutable `latest` for rollback.
* Record the **image digest** (`sha256:…`) in the GitHub Actions deploy summary.
* Rollback: redeploy the previous known-good digest/SHA tag to the same service.

## Environment and secrets strategy

| Concern | Mechanism |
|---------|-----------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Injected as a **Docker build-arg** in CI (URL-restricted public token). Expect it in the client bundle. |
| `MAPBOX_ACCESS_TOKEN` | Injected at **runtime** via ECS task environment / SSM or Secrets Manager reference — never as a long-lived GitHub Actions secret printed to logs |
| `.env.local` | Never copied into the image; never committed |
| Build vs runtime | Rebuild when the public token changes; rotate server token without rebuild |

Operator duties in Mapbox dashboard:

* Public token: restrict to the Express Mode HTTPS origin (and localhost for dev).
* Server token: least-privilege scopes for Geocoding/Directions only.

## GitHub OIDC design

Prepare (do not apply yet):

1. Create the GitHub OIDC identity provider in the AWS account if absent
   (`token.actions.githubusercontent.com`).
2. IAM role trust policy conditions:
   * `token.actions.githubusercontent.com:aud` = `sts.amazonaws.com`
   * `token.actions.githubusercontent.com:sub` restricted to this repository
     (`repo:Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System:*`)
   * Prefer further restriction to a GitHub Environment (`production`) and/or
     specific branches (`chore/release-baseline`, `main`)
3. Role permissions (minimum):
   * ECR: auth token, push/pull to `saferoute` repository only
   * ECS Express Mode / ECS: update service / register task definition for
     `saferoute-web` only
   * CloudWatch Logs: create/write to `/ecs/saferoute-web` only if required by
     the deployment API surface
4. **No long-lived AWS access keys** in GitHub secrets.
5. GitHub Environment protection: required reviewer / wait timer before
   production deploys.

Exact IAM JSON is deferred to the provisioning phase; this document freezes the
trust and least-privilege intent.

## Health checks and logging

* Liveness/readiness path: `GET /api/health` → 200 `{ "status": "ok" }`
* Application logs: stdout/stderr from the Node process → CloudWatch
* Do not log Mapbox tokens, full `.env` dumps, or precise personal GPS trails
* Metric starters: CPU, memory, HTTP 5xx count if Express Mode/CloudWatch
  exposes them without extra agents

## Rollback

1. Identify previous digest from the last successful deploy summary.
2. Redeploy that digest to `saferoute-web`.
3. Confirm `/api/health` and `/` return 200 on the public URL.
4. If deploy is half-applied, prefer service rollback over manual task surgery.

## Cost controls

Do **not** claim zero cost. Exact dollars require live AWS pricing/calculator
queries at provision time. Cost drivers for this design:

* ECS task CPU/memory-hours (always-on single task)
* Public HTTPS / load-balancer surface included with Express Mode
* ECR storage + data transfer
* CloudWatch log ingestion/storage (mitigate with short retention)
* Mapbox usage billed by Mapbox (separate from AWS)

Checklist:

* [ ] AWS Budget alert with a **low** monthly threshold for the account/region
* [ ] CloudWatch log retention 7–14 days
* [ ] Single task; no unused second service
* [ ] ECR lifecycle policy (expire untagged / old SHA tags beyond N images)
* [ ] No NAT Gateway / custom VPC unless required
* [ ] Monitor unexpected Mapbox request growth
* [ ] Tear down after the interview window if no longer needed

## Teardown plan

When the portfolio window ends:

1. Delete the ECS Express Mode service `saferoute-web`
2. Delete the ECR repository `saferoute` (or empty + delete)
3. Delete CloudWatch log group `/ecs/saferoute-web`
4. Remove the GitHub Environment deployment role trust if unused
5. Confirm AWS Cost Explorer shows no remaining SafeRoute charges in-region
6. Revoke/rotate Mapbox tokens used by the public deployment

## Manual AWS prerequisites

* AWS account with billing alerts enabled
* Choose and stick to `ap-southeast-2`
* Create ECR repo `saferoute` (or allow the first pipeline to create it under
  locked-down IAM)
* Configure GitHub OIDC provider + deploy role (no access keys)
* Create GitHub Environment `production` with protection rules
* Supply Mapbox public + server tokens via GitHub/AWS secret stores
* Authenticate Docker Scout or Trivy separately for image CVE gating (optional)

## Deployment acceptance criteria

Deploy is acceptable only when:

* Image tagged with commit SHA and digest recorded
* Service healthy on `/api/health`
* Public HTTPS `/` returns 200
* Process runs the hardened non-root image
* Server Mapbox token is runtime-only; public token origin-restricted
* CloudWatch receives application logs
* Rollback of the previous digest is documented and tested at least once in a
  dry run
* No database, NAT Gateway, or custom domain was introduced without need
* Teardown steps remain runnable by a single operator
