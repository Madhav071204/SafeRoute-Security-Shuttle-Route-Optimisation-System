<#
.SYNOPSIS
  Apply the SafeRouteGitHubDeployRole inline policy from the repository template.

.DESCRIPTION
  Updates only the GitHub OIDC deploy role policy (no ECS/ECR changes).
  Requires AWS CLI profile with iam:PutRolePolicy on SafeRouteGitHubDeployRole.
  Uses AWS_CA_BUNDLE when set (see docs/aws-first-deployment.md Windows note).
#>
[CmdletBinding()]
param(
  [string]$Profile = 'saferoute-admin',
  [string]$Region = 'ap-southeast-2',
  [string]$RepoRoot = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\..')).Path
)

$ErrorActionPreference = 'Stop'
$env:AWS_PROFILE = $Profile
$env:AWS_DEFAULT_REGION = $Region
$env:AWS_PAGER = ''

if (-not $env:AWS_CA_BUNDLE) {
  $defaultCa = Join-Path $env:USERPROFILE '.aws\windows-ca-bundle.pem'
  if (Test-Path $defaultCa) { $env:AWS_CA_BUNDLE = $defaultCa }
}

$accountId = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) { throw 'AWS authentication failed — run: aws login --profile saferoute-admin' }

$template = Join-Path $RepoRoot 'deploy\aws\policies\github-deploy.json.template'
$policy = (Get-Content $template -Raw) -replace 'ACCOUNT_ID', $accountId
$policyFile = Join-Path $env:TEMP 'saferoute-gh-deploy-policy.json'
[System.IO.File]::WriteAllText($policyFile, $policy)

aws iam put-role-policy `
  --role-name SafeRouteGitHubDeployRole `
  --policy-name SafeRouteGitHubDeploy `
  --policy-document "file://$policyFile"

if ($LASTEXITCODE -ne 0) { throw 'put-role-policy failed' }
Remove-Item $policyFile -Force -ErrorAction SilentlyContinue
Write-Host 'OK  Updated SafeRouteGitHubDeployRole inline policy SafeRouteGitHubDeploy' -ForegroundColor Green
