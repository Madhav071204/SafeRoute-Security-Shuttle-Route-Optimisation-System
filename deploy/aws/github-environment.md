# SafeRoute GitHub production environment (non-secret references)

Configure the GitHub Environment named `production` with:

## Variables (non-secret)

| Name | Example / notes |
|------|-----------------|
| `AWS_REGION` | `ap-southeast-2` |
| `ECR_REPOSITORY` | `saferoute` |
| `ECS_EXPRESS_SERVICE_NAME` | `saferoute-web` |
| `ECS_EXPRESS_SERVICE_ARN` | Full ARN from create/describe (CLI requires `--service-arn`) |
| `HEALTH_CHECK_PATH` | `/api/health` |
| `AWS_DEPLOY_ROLE_ARN` | ARN of `SafeRouteGitHubDeployRole` |
| `MAPBOX_SECRET_ARN` | ARN of `saferoute/mapbox-server` (reference only) |

## Secrets

| Name | Notes |
|------|-------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public browser token (still protected in Actions logs). Embedded in client bundle at build time. |

## Do not store in GitHub

| Name | Where it lives |
|------|----------------|
| `MAPBOX_ACCESS_TOKEN` | AWS Secrets Manager `saferoute/mapbox-server` only |
| Long-lived AWS access keys | Not used — OIDC assume-role only |

## Protection

Enable environment protection rules (required reviewers / wait timer) when
repository permissions allow.
