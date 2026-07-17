<#
.SYNOPSIS
  SafeRoute Phase 5 AWS bootstrap (ECR, Secrets, IAM, image push, Express Mode).

.DESCRIPTION
  Creates or reuses SafeRoute AWS resources in ap-southeast-2.
  Never prints Mapbox tokens or AWS secret values.
  Requires: AWS CLI (profile saferoute-admin), Docker, .env.local Mapbox keys,
  and AWS_BUDGET_EMAIL + AWS_BUDGET_LIMIT_USD before creating the ECS service.

.PARAMETER SkipEcs
  Prepare non-ECS resources only (budget guard missing or dry prep).

.PARAMETER SkipBudget
  Skip budget create/update (not recommended before ECS).

.PARAMETER ConfirmEcs
  Required to create/update the chargeable Express Mode service.
#>
[CmdletBinding()]
param(
  [switch]$SkipEcs,
  [switch]$SkipBudget,
  [switch]$ConfirmEcs,
  [string]$Profile = 'saferoute-admin',
  [string]$Region = 'ap-southeast-2',
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'
$env:AWS_PROFILE = $Profile
$env:AWS_DEFAULT_REGION = $Region
$env:AWS_PAGER = ''

function Write-Step([string]$Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "OK  $Message" -ForegroundColor Green }
function Write-WarnStep([string]$Message) { Write-Host "WARN $Message" -ForegroundColor Yellow }
function Mask-Arn([string]$Arn) {
  if (-not $Arn) { return 'n/a' }
  if ($Arn -match '^(arn:aws:[^:]+:[^:]*:)(\d{12})(:.+)$') {
    $acct = $Matches[2]
    $masked = $acct.Substring(0, 4) + '********' + $acct.Substring(8)
    return $Matches[1] + $masked + $Matches[3]
  }
  return $Arn
}
function Test-EnvPresence([string]$Name) {
  $v = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if (-not $v) { $v = [Environment]::GetEnvironmentVariable($Name, 'User') }
  return [bool]$v
}
function Import-DotEnvLocal {
  $path = Join-Path $RepoRoot '.env.local'
  if (-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    if ($key -and -not [Environment]::GetEnvironmentVariable($key, 'Process')) {
      [Environment]::SetEnvironmentVariable($key, $val, 'Process')
    }
  }
}
function Invoke-AwsJson {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AwsArgs)
  $raw = & aws @AwsArgs --output json 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($raw | Out-String) }
  if (-not $raw) { return $null }
  return ($raw | Out-String | ConvertFrom-Json)
}
function Test-AwsRoleExists([string]$RoleName) {
  & aws iam get-role --role-name $RoleName --output json 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

Write-Step 'Loading local env (keys only; values never printed)'
Import-DotEnvLocal
$mapboxPublic = if (Test-EnvPresence 'NEXT_PUBLIC_MAPBOX_TOKEN') { 'Present' } else { 'Missing' }
$mapboxServer = if (Test-EnvPresence 'MAPBOX_ACCESS_TOKEN') { 'Present' } else { 'Missing' }
$budgetEmail = if (Test-EnvPresence 'AWS_BUDGET_EMAIL') { 'Present' } else { 'Missing' }
$budgetLimit = if (Test-EnvPresence 'AWS_BUDGET_LIMIT_USD') { 'Present' } else { 'Missing' }
Write-Host "NEXT_PUBLIC_MAPBOX_TOKEN=$mapboxPublic"
Write-Host "MAPBOX_ACCESS_TOKEN=$mapboxServer"
Write-Host "AWS_BUDGET_EMAIL=$budgetEmail"
Write-Host "AWS_BUDGET_LIMIT_USD=$budgetLimit"

Write-Step 'AWS identity'
$identity = Invoke-AwsJson sts get-caller-identity
$accountId = [string]$identity.Account
Write-Ok ("Account={0} Arn={1}" -f ($accountId.Substring(0,4) + '********' + $accountId.Substring(8)), (Mask-Arn $identity.Arn))
Write-Ok "Region=$Region"

$deployDir = Join-Path $RepoRoot 'deploy\aws'
$taskTrust = Join-Path $deployDir 'iam\task-execution-trust.json'
$infraTrust = Join-Path $deployDir 'iam\infrastructure-trust.json'
$lifecycle = Join-Path $deployDir 'policies\ecr-lifecycle.json'
$secretPolicyTpl = Join-Path $deployDir 'policies\mapbox-secret-read.json.template'
$githubTrustTpl = Join-Path $deployDir 'iam\github-oidc-trust.json.template'
$githubPolicyTpl = Join-Path $deployDir 'policies\github-deploy.json.template'

# --- Budget (before ECS) ---
if (-not $SkipBudget) {
  Write-Step 'Cost budget'
  if ($budgetEmail -eq 'Missing' -or $budgetLimit -eq 'Missing') {
    Write-WarnStep 'Budget email/limit missing — ECS Express Mode will not be created.'
    $SkipEcs = $true
  } else {
    $existing = & aws budgets describe-budgets --account-id $accountId --output json 2>$null
    $hasSafeRoute = $false
    if ($LASTEXITCODE -eq 0 -and $existing) {
      $budgets = ($existing | ConvertFrom-Json).Budgets
      $hasSafeRoute = @($budgets | Where-Object { $_.BudgetName -eq 'SafeRoute-Monthly-Budget' }).Count -gt 0
    }
    $limit = $env:AWS_BUDGET_LIMIT_USD
    $email = $env:AWS_BUDGET_EMAIL
    $budgetJson = @{
      BudgetName = 'SafeRoute-Monthly-Budget'
      BudgetType = 'COST'
      TimeUnit = 'MONTHLY'
      BudgetLimit = @{ Amount = "$limit"; Unit = 'USD' }
    } | ConvertTo-Json -Compress -Depth 5
    $notifJson = @(
      @{ Notification = @{ NotificationType = 'ACTUAL'; ComparisonOperator = 'GREATER_THAN'; Threshold = 50; ThresholdType = 'PERCENTAGE' }; Subscribers = @(@{ SubscriptionType = 'EMAIL'; Address = $email }) },
      @{ Notification = @{ NotificationType = 'ACTUAL'; ComparisonOperator = 'GREATER_THAN'; Threshold = 80; ThresholdType = 'PERCENTAGE' }; Subscribers = @(@{ SubscriptionType = 'EMAIL'; Address = $email }) },
      @{ Notification = @{ NotificationType = 'ACTUAL'; ComparisonOperator = 'GREATER_THAN'; Threshold = 100; ThresholdType = 'PERCENTAGE' }; Subscribers = @(@{ SubscriptionType = 'EMAIL'; Address = $email }) }
    ) | ConvertTo-Json -Compress -Depth 6

    $budgetFile = Join-Path $env:TEMP 'saferoute-budget.json'
    $notifFile = Join-Path $env:TEMP 'saferoute-budget-notifications.json'
    Set-Content -Path $budgetFile -Value $budgetJson -Encoding utf8NoBOM
    Set-Content -Path $notifFile -Value $notifJson -Encoding utf8NoBOM

    if ($hasSafeRoute) {
      & aws budgets update-budget --account-id $accountId --new-budget "file://$budgetFile" | Out-Null
      Write-Ok 'Updated SafeRoute-Monthly-Budget (notifications unchanged if already set)'
    } else {
      & aws budgets create-budget --account-id $accountId --budget "file://$budgetFile" --notifications-with-subscribers "file://$notifFile"
      if ($LASTEXITCODE -ne 0) { throw 'Budget creation failed' }
      Write-Ok 'Created SafeRoute-Monthly-Budget with 50/80/100% notifications'
    }
    Remove-Item $budgetFile, $notifFile -ErrorAction SilentlyContinue
  }
}

# --- ECR ---
Write-Step 'ECR repository saferoute'
& aws ecr describe-repositories --repository-names saferoute --region $Region 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Invoke-AwsJson ecr create-repository `
    --repository-name saferoute `
    --image-tag-mutability IMMUTABLE `
    --image-scanning-configuration scanOnPush=true `
    --encryption-configuration encryptionType=AES256 `
    --tags Key=Project,Value=SafeRoute Key=Purpose,Value=Portfolio Key=ManagedBy,Value=Phase5 | Out-Null
  Write-Ok 'Created ECR repository saferoute'
} else {
  Write-Ok 'Reusing existing ECR repository saferoute'
}
& aws ecr put-lifecycle-policy --repository-name saferoute --lifecycle-policy-text "file://$lifecycle" --region $Region | Out-Null
$repo = Invoke-AwsJson ecr describe-repositories --repository-names saferoute --region $Region
$repoUri = [string]$repo.repositories[0].repositoryUri
Write-Ok ("URI={0}" -f ($repoUri -replace $accountId, ($accountId.Substring(0,4) + '********' + $accountId.Substring(8))))

# --- Secrets Manager ---
Write-Step 'Secrets Manager saferoute/mapbox-server'
if ($mapboxServer -eq 'Missing') {
  throw 'MAPBOX_ACCESS_TOKEN is Missing — cannot create/update secret'
}
$secretName = 'saferoute/mapbox-server'
& aws secretsmanager describe-secret --secret-id $secretName --region $Region 2>$null | Out-Null
# Store as a plain string so ECS can inject MAPBOX_ACCESS_TOKEN directly.
# (A JSON object secret requires valueFrom ...:MAPBOX_ACCESS_TOKEN:: instead.)
$secretFile = Join-Path $env:TEMP 'saferoute-mapbox-secret.txt'
[System.IO.File]::WriteAllText($secretFile, $env:MAPBOX_ACCESS_TOKEN)
if ($LASTEXITCODE -ne 0) {
  $created = Invoke-AwsJson secretsmanager create-secret `
    --name $secretName `
    --description 'SafeRoute server Mapbox token (MAPBOX_ACCESS_TOKEN)' `
    --secret-string "file://$secretFile" `
    --tags Key=Project,Value=SafeRoute Key=Purpose,Value=Portfolio `
    --region $Region
  $secretArn = [string]$created.ARN
  Write-Ok ("Created secret {0} ARN={1}" -f $secretName, (Mask-Arn $secretArn))
} else {
  Invoke-AwsJson secretsmanager put-secret-value --secret-id $secretName --secret-string "file://$secretFile" --region $Region | Out-Null
  $desc = Invoke-AwsJson secretsmanager describe-secret --secret-id $secretName --region $Region
  $secretArn = [string]$desc.ARN
  Write-Ok ("Updated secret value (referenced) {0} ARN={1}" -f $secretName, (Mask-Arn $secretArn))
}
Remove-Item $secretFile -Force -ErrorAction SilentlyContinue

# --- IAM roles ---
Write-Step 'ECS Express Mode IAM roles'
$execRole = 'SafeRouteEcsTaskExecutionRole'
$infraRole = 'SafeRouteEcsInfrastructureRole'

if (-not (Test-AwsRoleExists $execRole)) {
  Invoke-AwsJson iam create-role --role-name $execRole --assume-role-policy-document "file://$taskTrust" `
    --description 'SafeRoute ECS task execution role' --tags Key=Project,Value=SafeRoute Key=Purpose,Value=Portfolio | Out-Null
  Write-Ok "Created $execRole"
} else { Write-Ok "Reusing $execRole" }
& aws iam attach-role-policy --role-name $execRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy | Out-Null
$secretPolicy = (Get-Content $secretPolicyTpl -Raw) -replace 'ACCOUNT_ID', $accountId
$secretPolicyFile = Join-Path $env:TEMP 'saferoute-secret-policy.json'
[System.IO.File]::WriteAllText($secretPolicyFile, $secretPolicy)
& aws iam put-role-policy --role-name $execRole --policy-name SafeRouteMapboxSecretRead --policy-document "file://$secretPolicyFile" | Out-Null
Remove-Item $secretPolicyFile -Force -ErrorAction SilentlyContinue

if (-not (Test-AwsRoleExists $infraRole)) {
  Invoke-AwsJson iam create-role --role-name $infraRole --assume-role-policy-document "file://$infraTrust" `
    --description 'SafeRoute ECS Express Mode infrastructure role' --tags Key=Project,Value=SafeRoute Key=Purpose,Value=Portfolio | Out-Null
  Write-Ok "Created $infraRole"
} else { Write-Ok "Reusing $infraRole" }
& aws iam attach-role-policy --role-name $infraRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices | Out-Null

$execRoleArn = (Invoke-AwsJson iam get-role --role-name $execRole).Role.Arn
$infraRoleArn = (Invoke-AwsJson iam get-role --role-name $infraRole).Role.Arn
Write-Ok ("ExecRole={0}" -f (Mask-Arn $execRoleArn))
Write-Ok ("InfraRole={0}" -f (Mask-Arn $infraRoleArn))
Write-Host 'Waiting 12s for IAM propagation...'
Start-Sleep -Seconds 12

# --- GitHub OIDC ---
Write-Step 'GitHub OIDC provider + SafeRouteGitHubDeployRole'
$oidcUrl = 'https://token.actions.githubusercontent.com'
& aws iam list-open-id-connect-providers --output json | Out-Null
$providers = (Invoke-AwsJson iam list-open-id-connect-providers).OpenIDConnectProviderList
$oidcArn = $null
foreach ($p in $providers) {
  $det = Invoke-AwsJson iam get-open-id-connect-provider --open-id-connect-provider-arn $p.Arn
  if ($det.Url -eq 'token.actions.githubusercontent.com' -or $det.Url -eq $oidcUrl) {
    $oidcArn = $p.Arn
    break
  }
}
if (-not $oidcArn) {
  # GitHub Actions OIDC thumbprint (legacy requirement; AWS may ignore for known IdPs)
  $createdOidc = Invoke-AwsJson iam create-open-id-connect-provider `
    --url $oidcUrl `
    --client-id-list sts.amazonaws.com `
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
  $oidcArn = $createdOidc.OpenIDConnectProviderArn
  Write-Ok ("Created GitHub OIDC provider {0}" -f (Mask-Arn $oidcArn))
} else {
  Write-Ok ("Reusing GitHub OIDC provider {0}" -f (Mask-Arn $oidcArn))
}

$ghRole = 'SafeRouteGitHubDeployRole'
$ghTrust = ((Get-Content $githubTrustTpl -Raw) -replace 'ACCOUNT_ID', $accountId)
$ghTrustFile = Join-Path $env:TEMP 'saferoute-gh-trust.json'
[System.IO.File]::WriteAllText($ghTrustFile, $ghTrust)
if (-not (Test-AwsRoleExists $ghRole)) {
  Invoke-AwsJson iam create-role --role-name $ghRole --assume-role-policy-document "file://$ghTrustFile" `
    --description 'SafeRoute GitHub Actions OIDC deploy role' --tags Key=Project,Value=SafeRoute Key=Purpose,Value=Portfolio | Out-Null
  Write-Ok "Created $ghRole"
} else {
  & aws iam update-assume-role-policy --role-name $ghRole --policy-document "file://$ghTrustFile" | Out-Null
  Write-Ok "Updated trust on $ghRole"
}
$ghPolicy = ((Get-Content $githubPolicyTpl -Raw) -replace 'ACCOUNT_ID', $accountId)
$ghPolicyFile = Join-Path $env:TEMP 'saferoute-gh-policy.json'
[System.IO.File]::WriteAllText($ghPolicyFile, $ghPolicy)
& aws iam put-role-policy --role-name $ghRole --policy-name SafeRouteGitHubDeploy --policy-document "file://$ghPolicyFile" | Out-Null
Remove-Item $ghTrustFile, $ghPolicyFile -Force -ErrorAction SilentlyContinue
$ghRoleArn = (Invoke-AwsJson iam get-role --role-name $ghRole).Role.Arn
Write-Ok ("GitHubDeployRole={0}" -f (Mask-Arn $ghRoleArn))

# --- Build & push image ---
Write-Step 'Build and push immutable image'
if ($mapboxPublic -eq 'Missing') { throw 'NEXT_PUBLIC_MAPBOX_TOKEN is Missing — required as Docker build-arg' }
& docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is not available' }

Push-Location $RepoRoot
try {
  $gitSha = (git rev-parse HEAD).Trim()
  $shortSha = $gitSha.Substring(0, 12)
  $imageTag = $gitSha
  $buildDate = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  $localImage = "saferoute:$imageTag"

  Write-Host "Building $localImage (token not logged)"
  $env:DOCKER_BUILDKIT = '1'
  & docker build `
    --provenance=false `
    --sbom=false `
    --build-arg "NEXT_PUBLIC_MAPBOX_TOKEN=$($env:NEXT_PUBLIC_MAPBOX_TOKEN)" `
    --build-arg "GIT_REVISION=$gitSha" `
    --build-arg "BUILD_DATE=$buildDate" `
    --label "org.opencontainers.image.revision=$gitSha" `
    -t $localImage `
    .
  if ($LASTEXITCODE -ne 0) { throw 'docker build failed' }

  $loginPw = & aws ecr get-login-password --region $Region
  $loginPw | & docker login --username AWS --password-stdin $repoUri
  if ($LASTEXITCODE -ne 0) { throw 'ECR docker login failed' }

  $remoteImage = "${repoUri}:${imageTag}"
  & docker tag $localImage $remoteImage
  & docker push $remoteImage
  if ($LASTEXITCODE -ne 0) { throw 'docker push failed' }

  $img = Invoke-AwsJson ecr describe-images --repository-name saferoute --image-ids "imageTag=$imageTag" --region $Region
  $digest = [string]$img.imageDetails[0].imageDigest
  $sizeBytes = [long]$img.imageDetails[0].imageSizeInBytes
  Write-Ok "ImageTag=$imageTag Short=$shortSha"
  Write-Ok "Digest=$digest SizeMB=$([math]::Round($sizeBytes/1MB, 2))"

  # Best-effort scan status
  Start-Sleep -Seconds 5
  $scan = & aws ecr describe-image-scan-findings --repository-name saferoute --image-id "imageDigest=$digest" --region $Region --output json 2>$null
  if ($LASTEXITCODE -eq 0) {
    $scanObj = $scan | ConvertFrom-Json
    $status = $scanObj.imageScanStatus.status
    $sev = $scanObj.imageScanFindings.findingSeverityCounts
    Write-Ok "ScanStatus=$status Findings=$($sev | ConvertTo-Json -Compress)"
  } else {
    Write-WarnStep 'Image scan findings not ready or unavailable'
  }
} finally {
  Pop-Location
}

# --- ECS Express Mode ---
if ($SkipEcs) {
  Write-WarnStep 'Skipping ECS Express Mode (budget guard or -SkipEcs).'
  Write-Host "Recorded prep: ECR=$repoUri secret=$secretName roles ready image=$imageTag@$digest"
  return
}
if (-not $ConfirmEcs) {
  Write-WarnStep 'Pass -ConfirmEcs to create/update the chargeable saferoute-web service.'
  return
}

Write-Step 'ECS Express Mode service saferoute-web'
$imageByDigest = "${repoUri}@$digest"
# Current AWS CLI requires --service-arn for describe; discover via list if available.
$serviceArn = $null
$listOut = & aws ecs list-services --cluster default --region $Region --output json 2>$null
if ($LASTEXITCODE -eq 0) {
  $arns = (($listOut | ConvertFrom-Json).serviceArns) | Where-Object { $_ -match 'saferoute-web' }
  if ($arns) { $serviceArn = @($arns)[0] }
}
# Fallback: construct Express service ARN pattern used by ECS Express Mode
if (-not $serviceArn) {
  $probeArn = "arn:aws:ecs:${Region}:${accountId}:service/default/saferoute-web"
  & aws ecs describe-express-gateway-service --service-arn $probeArn --region $Region 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $serviceArn = $probeArn }
}
$serviceExists = [bool]$serviceArn

$primaryContainer = @{
  image = $imageByDigest
  containerPort = 3000
  awsLogsConfiguration = @{ logGroup = '/ecs/saferoute-web'; logStreamPrefix = 'ecs' }
  environment = @(
    @{ name = 'NODE_ENV'; value = 'production' }
  )
  secrets = @(
    @{ name = 'MAPBOX_ACCESS_TOKEN'; valueFrom = "$secretArn" }
  )
} | ConvertTo-Json -Compress -Depth 6
$pcFile = Join-Path $env:TEMP 'saferoute-primary-container.json'
[System.IO.File]::WriteAllText($pcFile, $primaryContainer)

$scaling = @{ minTaskCount = 1; maxTaskCount = 2 } | ConvertTo-Json -Compress
$scaleFile = Join-Path $env:TEMP 'saferoute-scaling.json'
[System.IO.File]::WriteAllText($scaleFile, $scaling)

if (-not $serviceExists) {
  $createOut = & aws ecs create-express-gateway-service `
    --service-name saferoute-web `
    --execution-role-arn $execRoleArn `
    --infrastructure-role-arn $infraRoleArn `
    --health-check-path /api/health `
    --cpu 256 `
    --memory 512 `
    --primary-container "file://$pcFile" `
    --scaling-target "file://$scaleFile" `
    --monitor-resources `
    --tags key=Project,value=SafeRoute key=Purpose,value=Portfolio `
    --region $Region `
    --output json
  if ($LASTEXITCODE -ne 0) { throw "create-express-gateway-service failed: $createOut" }
  $created = $createOut | ConvertFrom-Json
  $serviceArn = [string]$created.service.serviceArn
  if (-not $serviceArn) { $serviceArn = "arn:aws:ecs:${Region}:${accountId}:service/default/saferoute-web" }
  Write-Ok ("Create requested ARN={0}" -f (Mask-Arn $serviceArn))
} else {
  $updateOut = & aws ecs update-express-gateway-service `
    --service-arn $serviceArn `
    --primary-container "file://$pcFile" `
    --region $Region `
    --output json
  if ($LASTEXITCODE -ne 0) { throw "update-express-gateway-service failed: $updateOut" }
  Write-Ok 'Update requested for saferoute-web'
}

Write-Step 'Monitoring Express Mode until ACTIVE'
if (-not $serviceArn) {
  $serviceArn = "arn:aws:ecs:${Region}:${accountId}:service/default/saferoute-web"
}
$deadline = (Get-Date).AddMinutes(15)
$url = $null
$code = $null
do {
  Start-Sleep -Seconds 20
  $mon = & aws ecs describe-express-gateway-service --service-arn $serviceArn --region $Region --output json 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-WarnStep "describe pending: $mon"
    continue
  }
  $svc = ($mon | ConvertFrom-Json).service
  $code = $svc.status.statusCode
  Write-Host "status=$code"
  # Express Mode exposes HTTPS endpoints under ingressPaths[].endpoint
  if ($svc.activeConfigurations) {
    foreach ($cfg in $svc.activeConfigurations) {
      if ($cfg.ingressPaths) {
        foreach ($p in $cfg.ingressPaths) {
          if ($p.endpoint -match '^https://') { $url = $p.endpoint; break }
        }
      }
    }
  }
  if (-not $url) {
    $m = [regex]::Match(($mon | Out-String), 'https://[a-zA-Z0-9._-]+\.on\.aws[^\s\"]*')
    if ($m.Success) { $url = $m.Value }
  }
  if ($url) { Write-Host "url=$url" }
  if ($code -eq 'ACTIVE') { break }
  if ($code -eq 'INACTIVE') { throw 'Service became INACTIVE during provisioning' }
} while ((Get-Date) -lt $deadline)

if ($code -ne 'ACTIVE') { throw 'Timed out waiting for ACTIVE' }
Write-Ok "Service ACTIVE"

# Log retention
Write-Step 'CloudWatch log retention 7 days'
& aws logs put-retention-policy --log-group-name /ecs/saferoute-web --retention-in-days 7 --region $Region 2>$null
if ($LASTEXITCODE -eq 0) { Write-Ok 'Retention set to 7 days' } else { Write-WarnStep 'Log group may not exist yet; set retention after first logs' }

Write-Host "`n=== BOOTSTRAP SUMMARY (sanitised) ==="
Write-Host "Account: $($accountId.Substring(0,4))********$($accountId.Substring(8))"
Write-Host "Region: $Region"
Write-Host "ECR: saferoute"
Write-Host "ImageTag: $imageTag"
Write-Host "Digest: $digest"
Write-Host "Secret: $secretName"
Write-Host "Service: saferoute-web ACTIVE"
Write-Host "ServiceArn: $(Mask-Arn $serviceArn)"
Write-Host "URL: $url"
Write-Host "GitHubRole: $(Mask-Arn $ghRoleArn)"
