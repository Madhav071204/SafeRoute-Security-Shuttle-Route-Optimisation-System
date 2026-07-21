<#
.SYNOPSIS
  Rollback saferoute-web to a known-good ECR image digest.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ImageDigest,
  [string]$Profile = 'saferoute-admin',
  [string]$Region = 'ap-southeast-2',
  [string]$ServiceName = 'saferoute-web',
  [string]$Repository = 'saferoute'
)

$ErrorActionPreference = 'Stop'
$env:AWS_PROFILE = $Profile
$env:AWS_DEFAULT_REGION = $Region
$env:AWS_PAGER = ''

if ($ImageDigest -notmatch '^sha256:[a-f0-9]{64}$') {
  throw 'ImageDigest must look like sha256:<64 hex chars>'
}

$repo = aws ecr describe-repositories --repository-names $Repository --region $Region --output json | ConvertFrom-Json
$uri = $repo.repositories[0].repositoryUri

aws ecr describe-images --repository-name $Repository --image-ids "imageDigest=$ImageDigest" --region $Region --output json | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Digest not found in ECR repository $Repository"
}

$svc = aws ecs describe-express-gateway-service --service-arn "arn:aws:ecs:${Region}:$((aws sts get-caller-identity --query Account --output text)):service/default/$ServiceName" --region $Region --output json | ConvertFrom-Json
$cfg = $svc.service.activeConfigurations[0]
$secretRef = $null
if ($cfg.primaryContainer.secrets) {
  $secretRef = ($cfg.primaryContainer.secrets | Where-Object { $_.name -eq 'MAPBOX_ACCESS_TOKEN' } | Select-Object -First 1).valueFrom
}

$primary = @{
  image = "${uri}@$ImageDigest"
  containerPort = 3000
  awsLogsConfiguration = @{ logGroup = '/ecs/saferoute-web'; logStreamPrefix = 'ecs' }
  environment = @(@{ name = 'NODE_ENV'; value = 'production' })
}
if ($secretRef) {
  $primary.secrets = @(@{ name = 'MAPBOX_ACCESS_TOKEN'; valueFrom = $secretRef })
}

$pcFile = Join-Path $env:TEMP 'saferoute-rollback-container.json'
[System.IO.File]::WriteAllText($pcFile, ($primary | ConvertTo-Json -Compress -Depth 6))

$serviceArn = $svc.service.serviceArn
Write-Host "Rolling back $ServiceName to $ImageDigest"
aws ecs update-express-gateway-service --service-arn $serviceArn --primary-container "file://$pcFile" --region $Region --output json | Out-Host

$deadline = (Get-Date).AddMinutes(15)
do {
  Start-Sleep -Seconds 15
  $state = aws ecs describe-express-gateway-service --service-arn $serviceArn --region $Region --output json | ConvertFrom-Json
  $code = $state.service.status.statusCode
  Write-Host "status=$code"
  if ($code -eq 'ACTIVE') { break }
} while ((Get-Date) -lt $deadline)

if ($code -ne 'ACTIVE') { throw 'Rollback did not reach ACTIVE in time' }

# Discover URL from describe output when present
$json = $state | ConvertTo-Json -Depth 8
$urlMatch = [regex]::Match($json, 'https://[a-zA-Z0-9._-]+\.on\.aws')
if ($urlMatch.Success) {
  $url = $urlMatch.Value
  Write-Host "Verifying $url/api/health"
  $health = Invoke-WebRequest -Uri "$url/api/health" -UseBasicParsing
  if ($health.StatusCode -ne 200) { throw "Health check failed: $($health.StatusCode)" }
  Write-Host "Health OK: $($health.Content)"
}

Write-Host "Rollback complete to $ImageDigest"
