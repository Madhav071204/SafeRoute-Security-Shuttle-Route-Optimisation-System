# SafeRoute First AWS Deployment

## Deployment date

2026-07-18 (Australia/Sydney)

## Region

`ap-southeast-2` (Sydney)

## Deployed commit

`e0dd4a2a86b72e532ae61538ce4974f9e2f4d059` (merge of PR #3 into `chore/release-baseline`)

Image tag used: `e0dd4a2a86b72e532ae61538ce4974f9e2f4d059-linux-amd64`  
(Built with `--provenance=false --sbom=false` so ECR basic scanning accepts a Docker v2 manifest.)

## Image tag and digest

| Field | Value |
|-------|-------|
| Tag | `e0dd4a2a86b72e532ae61538ce4974f9e2f4d059-linux-amd64` |
| Digest | `sha256:70fe0a83d577f133629b5db7a8989a7c8d11ab8498c64d58ec2f501da5cc7eb7` |
| Approx size | ~95 MB |
| Scan | COMPLETE — CRITICAL 3, HIGH 5, MEDIUM 3 (base image CVEs; not gated in Phase 5) |

## ECR repository

| Field | Value |
|-------|-------|
| Name | `saferoute` |
| URI (sanitised) | `6908********0404.dkr.ecr.ap-southeast-2.amazonaws.com/saferoute` |
| Mutability | IMMUTABLE |
| Scan on push | enabled |
| Encryption | AES256 |
| Lifecycle | keep 10 tagged images; expire untagged after 7 days |

## ECS Express Mode service

| Field | Value |
|-------|-------|
| Name | `saferoute-web` |
| Status | ACTIVE |
| CPU / memory | 256 / 512 |
| Tasks | min 1 / max 2 |
| Health path | `/api/health` |
| Service ARN | `arn:aws:ecs:ap-southeast-2:6908********0404:service/default/saferoute-web` |
| Revision (at verification) | `.../service-revision/default/saferoute-web/0670214419737168548` |

## Public HTTPS URL

https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws

## Health verification

| Check | Result |
|-------|--------|
| `GET /api/health` | 200 `{"status":"ok"}` |
| `GET /` | 200 HTML (SafeRoute) |
| Static `/_next/static/...` | 200 |
| Target group health | healthy |
| `POST /api/optimize` (synthetic) | 200 ordered stops |
| `POST /api/route` (synthetic) | 200 `routeSource: mapbox`, `isFallback: false` |

**Local DNS note:** Monash recursive DNS (`ns1.its.monash.edu.au`) returned NXDOMAIN for `*.on.aws`. Public resolvers (8.8.8.8 / 1.1.1.1) resolve correctly. Verification used public DNS / Host-header against the ALB.

## Runtime configuration

| Item | Value |
|------|-------|
| `NODE_ENV` | `production` |
| Container port | 3000 |
| Log group | `/ecs/saferoute-web` |
| Public Mapbox token | Docker build-arg `NEXT_PUBLIC_MAPBOX_TOKEN` (client bundle) |
| Server Mapbox token | Secrets Manager → ECS secret `MAPBOX_ACCESS_TOKEN` |

## Secret strategy

* Secret name: `saferoute/mapbox-server`
* Stored as a **plain string** token (not a JSON object) so ECS injects the value correctly.
* Not stored in GitHub. GitHub Environment variable `MAPBOX_SECRET_ARN` is a reference only.
* `NEXT_PUBLIC_MAPBOX_TOKEN` is a GitHub Environment **secret** used at image build time only.

## OIDC trust design

* Provider: `token.actions.githubusercontent.com` (created in account)
* Role: `SafeRouteGitHubDeployRole`
* Trust restricted to repo `Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System` for `environment:production` and `ref:refs/heads/chore/release-baseline`
* Audience: `sts.amazonaws.com`
* No long-lived AWS access keys in GitHub

## GitHub deployment workflow

* `.github/workflows/ci.yml` — push to `chore/release-baseline` runs validate → e2e → deploy (OIDC)
* `.github/workflows/rollback.yml` — workflow_dispatch with validated ECR digest
* Environment: `production` (variables + `NEXT_PUBLIC_MAPBOX_TOKEN` secret)

## CloudWatch logging

* Log group `/ecs/saferoute-web`
* Retention: **7 days**
* Sampled logs: no Mapbox token material observed

## Cost controls

| Control | Detail |
|---------|--------|
| Existing | `My Zero-Spend Budget` ($1) |
| SafeRoute | `SafeRoute-Monthly-Budget` **$5 USD** monthly, notifications at 50% / 80% / 100% |
| Architecture | No NAT Gateway, no custom VPC, single Express service, ECR lifecycle |

## Rollback procedure

1. Identify prior digest from deploy summary / ECR.
2. Run workflow **Rollback production** with that digest, or:
   `.\deploy\aws\rollback.ps1 -ImageDigest sha256:...`
3. Confirm `/api/health` and `/` return 200.

## Teardown procedure

Dry-run by default:

```powershell
.\deploy\aws\teardown.ps1
.\deploy\aws\teardown.ps1 -ConfirmTeardown   # destructive
```

Deletes only SafeRoute-named resources (Express service, ECR `saferoute`, log group, secret, SafeRoute IAM roles). Budget deletion is opt-in (`-IncludeBudget`).

## Deployment problems encountered

1. Windows AWS CLI SSL verify failed until a Windows CA bundle was supplied (`AWS_CA_BUNDLE`).
2. ECR scan rejected OCI attestation indexes — rebuild with `--provenance=false --sbom=false`.
3. ECS service-linked Application Auto Scaling role was missing; created before Express create succeeded.
4. `--monitor-resources` requires a TTY; create still succeeded without interactive monitor.
5. JSON-object Secrets Manager value caused Mapbox fallback until replaced with a plain-string secret.
6. Campus DNS does not resolve `*.on.aws` (public DNS does).

## Remaining manual checks

* [x] PR #4 merged into `chore/release-baseline` (merge `c71548f`, 2026-07-20)
* [x] First CD workflow triggered — validate/e2e/deploy jobs ran; deploy failed on missing `ecs:RegisterTaskDefinition` (see `docs/production-acceptance.md`)
* [x] Production API health + Mapbox routing verified on current serving image
* [x] Production Playwright smoke (3 tests) passed locally
* [ ] Apply updated GitHub deploy IAM policy (`deploy/aws/apply-github-deploy-policy.ps1`) and re-run CD deploy job
* [ ] Restrict Mapbox public token URL origins to the Express HTTPS host (+ localhost for dev)
* [ ] Confirm GitHub Environment protection rules (reviewer / wait timer) if desired
* [ ] Merge `fix/production-security-closure` and verify ECS serves new digest after CD success

## Phase 5B — PR #4 merge and first CD (2026-07-20)

| Item | Evidence |
|------|----------|
| PR #4 merge commit | `c71548fbd5d9d96e67e3e1291dcee348ecede150` |
| CD workflow | [run 29721603128](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/runs/29721603128) |
| OIDC | Succeeded |
| Image pushed (not deployed) | `c71548f…` @ `sha256:88ade0420bf1a1251d7bbbd1848d813a7aa2b1e97094014f79bae045a8caa0f8` |
| Deploy blocker | `ecs:RegisterTaskDefinition` denied — fixed in `fix/production-security-closure` |
| Acceptance record | `docs/production-acceptance.md` |
