<#
.SYNOPSIS
  Guarded SafeRoute AWS teardown (dry-run by default).

.DESCRIPTION
  Deletes only resources identified by exact SafeRoute names/tags.
  Does not run destructive deletes unless -ConfirmTeardown is passed.
  Never deletes unrelated account resources.
#>
[CmdletBinding()]
param(
  [switch]$ConfirmTeardown,
  [switch]$IncludeBudget,
  [string]$Profile = 'saferoute-admin',
  [string]$Region = 'ap-southeast-2'
)

$ErrorActionPreference = 'Stop'
$env:AWS_PROFILE = $Profile
$env:AWS_DEFAULT_REGION = $Region
$env:AWS_PAGER = ''

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }

$targets = @(
  'ECS Express Mode service: saferoute-web',
  'ECR repository: saferoute (and images)',
  'CloudWatch log group: /ecs/saferoute-web',
  'Secrets Manager: saferoute/mapbox-server',
  'IAM roles: SafeRouteEcsTaskExecutionRole, SafeRouteEcsInfrastructureRole, SafeRouteGitHubDeployRole',
  'Inline policies attached to those roles'
)
if ($IncludeBudget) { $targets += 'Budget: SafeRoute-Monthly-Budget (only if exclusively SafeRoute)' }

Write-Host 'SafeRoute teardown targets:'
$targets | ForEach-Object { Write-Host "  - $_" }

if (-not $ConfirmTeardown) {
  Write-Host "`nDRY-RUN only. Re-run with -ConfirmTeardown to delete." -ForegroundColor Yellow
  Write-Host 'Example: .\deploy\aws\teardown.ps1 -ConfirmTeardown'
  Write-Host 'Optional: -IncludeBudget (only if the budget is exclusively SafeRoute)'
  exit 0
}

$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
$accountId = $identity.Account

Step 'Delete ECS Express Mode service saferoute-web'
$acct = $accountId
$svcArn = "arn:aws:ecs:${Region}:${acct}:service/default/saferoute-web"
aws ecs delete-express-gateway-service --service-arn $svcArn --region $Region 2>&1 | Out-Host

Step 'Delete CloudWatch log group /ecs/saferoute-web'
aws logs delete-log-group --log-group-name /ecs/saferoute-web --region $Region 2>&1 | Out-Host

Step 'Delete secret saferoute/mapbox-server'
aws secretsmanager delete-secret --secret-id saferoute/mapbox-server --force-delete-without-recovery --region $Region 2>&1 | Out-Host

Step 'Delete ECR repository saferoute'
aws ecr delete-repository --repository-name saferoute --force --region $Region 2>&1 | Out-Host

Step 'Detach/delete SafeRoute IAM roles'
foreach ($role in @('SafeRouteEcsTaskExecutionRole', 'SafeRouteEcsInfrastructureRole', 'SafeRouteGitHubDeployRole')) {
  $attached = aws iam list-attached-role-policies --role-name $role --output json 2>$null
  if ($LASTEXITCODE -eq 0) {
    ($attached | ConvertFrom-Json).AttachedPolicies | ForEach-Object {
      aws iam detach-role-policy --role-name $role --policy-arn $_.PolicyArn | Out-Null
    }
  }
  $inline = aws iam list-role-policies --role-name $role --output json 2>$null
  if ($LASTEXITCODE -eq 0) {
    ($inline | ConvertFrom-Json).PolicyNames | ForEach-Object {
      aws iam delete-role-policy --role-name $role --policy-name $_ | Out-Null
    }
  }
  aws iam delete-role --role-name $role 2>&1 | Out-Host
}

if ($IncludeBudget) {
  Step 'Delete SafeRoute-Monthly-Budget'
  aws budgets delete-budget --account-id $accountId --budget-name SafeRoute-Monthly-Budget 2>&1 | Out-Host
}

Write-Host "`nTeardown commands completed. Verify Cost Explorer for remaining charges." -ForegroundColor Green
Write-Host 'GitHub Environment secrets/variables and OIDC provider were NOT deleted (shared).'
Write-Host 'Rotate Mapbox tokens used by the public deployment when finished.'
