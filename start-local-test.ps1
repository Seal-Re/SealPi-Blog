param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Assert-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing command: $name. $hint"
  }
}

function Test-PortInUse($port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

function Test-TcpConnect([string]$targetHost, [int]$port, [int]$timeoutMs = 1500) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect($targetHost, $port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne($timeoutMs, $false)
    if (-not $ok) {
      return $false
    }
    $client.EndConnect($iar)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Assert-PortAvailable($ports) {
  $busy = @()
  foreach ($p in $ports) {
    if (Test-PortInUse $p) {
      $busy += $p
    }
  }

  if ($busy.Count -gt 0) {
    throw "Ports already in use: $($busy -join ', '). Please free them and retry."
  }
}

function Wait-MySqlContainerReady([string]$password, [int]$maxWaitSec = 90, [int]$stepSec = 5) {
  Write-Step "Wait for MySQL container readiness (mysqladmin ping)"
  $waited = 0
  while ($waited -lt $maxWaitSec) {
    $null = docker compose --env-file ".env.backend.local" exec -T -e MYSQL_PWD=$password mysql mysqladmin ping -h localhost -u root 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "MySQL container is ready." -ForegroundColor Gray
      return
    }

    Start-Sleep -Seconds $stepSec
    $waited += $stepSec
    Write-Host "  mysql wait: ${waited}s ..." -ForegroundColor DarkGray
  }

  throw "MySQL container is not ready after ${maxWaitSec}s. Check: docker compose logs mysql"
}

function Set-EnvValueInFile([string]$filePath, [string]$key, [string]$value) {
  $lines = @()
  if (Test-Path $filePath) {
    $lines = Get-Content -Path $filePath -Encoding UTF8
  }

  $escapedKey = [regex]::Escape($key)
  $matched = $false
  $nextLines = @()
  foreach ($line in $lines) {
    if ($line -match "^\s*$escapedKey\s*=") {
      $nextLines += "${key}=${value}"
      $matched = $true
    } else {
      $nextLines += $line
    }
  }

  if (-not $matched) {
    $nextLines += "${key}=${value}"
  }

  Set-Content -Path $filePath -Value $nextLines -Encoding UTF8
}

function Get-EnvValueFromFile([string]$filePath, [string]$key) {
  if (-not (Test-Path $filePath)) {
    return ""
  }
  $escapedKey = [regex]::Escape($key)
  $line = Get-Content -Path $filePath -Encoding UTF8 | Where-Object { $_ -match "^\s*$escapedKey\s*=" } | Select-Object -First 1
  if (-not $line) {
    return ""
  }
  return ($line -replace "^\s*$escapedKey\s*=\s*", "").Trim()
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root "tailwind-nextjs-starter-blog-sealpi"
$backendDir = Join-Path $root "sealpi-blog"
$frontendEnvLocal = Join-Path $frontendDir ".env.local"
$backendEnvExample = Join-Path $root ".env.backend.example"
$backendEnvLocal = Join-Path $root ".env.backend.local"

$servicePorts = @(13310, 13999)

Write-Step "Check required commands"
Assert-Command "docker" "Install and start Docker Desktop first."
Assert-Command "npm" "Install Node.js (20+) first."
Assert-Command "java" "Install JDK 21 first."

Write-Step "Check service port availability (13310/13999)"
Assert-PortAvailable $servicePorts

Write-Step "Prepare backend env file"
if (-not (Test-Path $backendEnvLocal)) {
  if (-not (Test-Path $backendEnvExample)) {
    throw "Missing .env.backend.example at project root."
  }
  Copy-Item -Path $backendEnvExample -Destination $backendEnvLocal
  Write-Host "Created .env.backend.local from example." -ForegroundColor Gray
}

function Get-RequiredBackendEnv([string]$key, [string]$prompt) {
  $value = Get-EnvValueFromFile $backendEnvLocal $key
  if ([string]::IsNullOrWhiteSpace($value) -or $value -like "change-me-*") {
    $inputValue = Read-Host $prompt
    if ([string]::IsNullOrWhiteSpace($inputValue)) {
      throw "$key is empty. Abort."
    }
    Set-EnvValueInFile $backendEnvLocal $key $inputValue.Trim()
    $value = $inputValue.Trim()
  }
  return $value
}

$mysqlRootPassword = Get-RequiredBackendEnv "MYSQL_ROOT_PASSWORD" "Missing MYSQL_ROOT_PASSWORD in .env.backend.local. Input MySQL root password"
$mysqlDatabase = (Get-EnvValueFromFile $backendEnvLocal "MYSQL_DATABASE").Trim()
$mysqlDatabase = $mysqlDatabase.Trim('"').Trim("'").Trim()
if ([string]::IsNullOrWhiteSpace($mysqlDatabase)) {
  $mysqlDatabase = "sealpi_blog"
  Set-EnvValueInFile $backendEnvLocal "MYSQL_DATABASE" $mysqlDatabase
}
$minioRootUser = Get-RequiredBackendEnv "MINIO_ROOT_USER" "Missing MINIO_ROOT_USER in .env.backend.local. Input MinIO user"
$minioRootPassword = Get-RequiredBackendEnv "MINIO_ROOT_PASSWORD" "Missing MINIO_ROOT_PASSWORD in .env.backend.local. Input MinIO password"

Write-Step "Start infrastructure (MySQL/MinIO)"
Push-Location $root
docker compose --env-file ".env.backend.local" up -d mysql minio minio-init | Out-Host
Pop-Location

Push-Location $root
Wait-MySqlContainerReady $mysqlRootPassword
Pop-Location

Write-Step "Verify host TCP connectivity to MySQL (127.0.0.1:13307)"
if (-not (Test-TcpConnect "127.0.0.1" 13307)) {
  throw "MySQL container is ready but host cannot connect to 127.0.0.1:13307. Check firewall/port proxy and run: docker compose ps"
}

Write-Step "Patch frontend .env.local (preserve existing OAuth config)"
Set-EnvValueInFile $frontendEnvLocal "NEXT_PUBLIC_BLOG_API_BASE_URL" "http://127.0.0.1:13310"

Write-Step "Validate required backend secrets"
$githubId = Get-RequiredBackendEnv "GITHUB_ID" "Missing GITHUB_ID in .env.backend.local. Input GitHub OAuth Client ID"
$githubSecret = Get-RequiredBackendEnv "GITHUB_SECRET" "Missing GITHUB_SECRET in .env.backend.local. Input GitHub OAuth Client Secret"
$authSecret = Get-RequiredBackendEnv "AUTH_SECRET" "Missing AUTH_SECRET in .env.backend.local. Input NextAuth AUTH_SECRET"
$internalSyncSecret = Get-RequiredBackendEnv "BLOG_INTERNAL_SYNC_SECRET" "Missing BLOG_INTERNAL_SYNC_SECRET in .env.backend.local. Input internal sync secret"
$adminJwtSecret = Get-RequiredBackendEnv "ADMIN_JWT_SECRET" "Missing ADMIN_JWT_SECRET in .env.backend.local. Input admin JWT secret"
$adminGithubUserIds = Get-RequiredBackendEnv "ADMIN_GITHUB_USERIDS" "Missing ADMIN_GITHUB_USERIDS in .env.backend.local. Input admin github IDs csv"
$adminJwtClaim = Get-EnvValueFromFile $backendEnvLocal "ADMIN_JWT_GITHUBUSERIDCLAIM"
if ([string]::IsNullOrWhiteSpace($adminJwtClaim)) {
  $adminJwtClaim = "githubUserId"
  Set-EnvValueInFile $backendEnvLocal "ADMIN_JWT_GITHUBUSERIDCLAIM" $adminJwtClaim
}
$allowLegacyJwt = Get-EnvValueFromFile $backendEnvLocal "ADMIN_AUTH_ALLOW_LEGACY_JWT"
if ([string]::IsNullOrWhiteSpace($allowLegacyJwt)) {
  $allowLegacyJwt = "false"
  Set-EnvValueInFile $backendEnvLocal "ADMIN_AUTH_ALLOW_LEGACY_JWT" $allowLegacyJwt
}

if ([string]::IsNullOrWhiteSpace($mysqlDatabase)) {
  throw "MYSQL_DATABASE is empty after resolution. Please check .env.backend.local"
}
if ($mysqlDatabase.Contains("?") -or $mysqlDatabase.Contains("=") -or $mysqlDatabase.Contains("&")) {
  throw "MYSQL_DATABASE contains illegal characters: '$mysqlDatabase'. Please use plain db name like sealpi_blog"
}
$datasourceUrl = "jdbc:mysql://127.0.0.1:13307/${mysqlDatabase}?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai"
Write-Host "Resolved SPRING_DATASOURCE_URL: $datasourceUrl" -ForegroundColor Gray

Write-Step "Set npm registry for this project (avoid mirror timeout)"
Push-Location $frontendDir
npm config set registry https://registry.npmjs.org --location=project | Out-Host
$projectRegistry = npm config get registry --location=project
Pop-Location
Write-Host "Project npm registry: $projectRegistry" -ForegroundColor Gray

if (-not $SkipInstall) {
  Write-Step "Install frontend dependencies"
  Push-Location $frontendDir
  npm install | Out-Host
  Pop-Location
}

Write-Step "Start backend on 13310"
$backendCommand = @"
`$env:SPRING_DATASOURCE_URL='$datasourceUrl'
`$env:SPRING_DATASOURCE_USERNAME='root'
`$env:SPRING_DATASOURCE_PASSWORD='$mysqlRootPassword'
`$env:BLOG_INTERNAL_SYNC_SECRET='$internalSyncSecret'
`$env:ADMIN_JWT_SECRET='$adminJwtSecret'
`$env:ADMIN_GITHUB_USERIDS='$adminGithubUserIds'
`$env:ADMIN_JWT_GITHUBUSERIDCLAIM='$adminJwtClaim'
`$env:ADMIN_AUTH_ALLOW_LEGACY_JWT='$allowLegacyJwt'
`$env:ADMIN_GITHUB_USERAPI='https://api.github.com/user'
`$env:ADMIN_UPLOAD_MINIO_ENDPOINT='http://127.0.0.1:13308'
`$env:ADMIN_UPLOAD_MINIO_ACCESSKEY='$minioRootUser'
`$env:ADMIN_UPLOAD_MINIO_SECRETKEY='$minioRootPassword'
`$env:ADMIN_UPLOAD_MINIO_BUCKET='blog-assets'
`$env:ADMIN_UPLOAD_PUBLICBASEURL='http://127.0.0.1:13308'
`$env:SERVER_PORT='13310'
Write-Host "Backend DS URL => `$env:SPRING_DATASOURCE_URL" -ForegroundColor Gray
Set-Location "$backendDir"
.\mvnw.cmd -f "$backendDir\blog-start\pom.xml" spring-boot:run
"@
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendCommand) | Out-Null

Write-Step "Start frontend on 13999"
$frontendCommand = @"
Set-Location "$frontendDir"
`$env:AUTH_URL='http://localhost:13999'
`$env:NEXTAUTH_URL='http://localhost:13999'
`$env:BLOG_API_BASE_URL='http://127.0.0.1:13310'
`$env:AUTH_SECRET='$authSecret'
`$env:GITHUB_ID='$githubId'
`$env:GITHUB_SECRET='$githubSecret'
`$env:ADMIN_GITHUB_USERIDS='$adminGithubUserIds'
`$env:ADMIN_JWT_SECRET='$adminJwtSecret'
`$env:ADMIN_JWT_GITHUBUSERIDCLAIM='$adminJwtClaim'
`$env:BLOG_INTERNAL_SYNC_SECRET='$internalSyncSecret'
`$env:MINIO_PUBLIC_HOSTNAME='127.0.0.1'
npx next dev -p 13999
"@
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendCommand) | Out-Null

Write-Step "All done"
Write-Host "Frontend:      http://127.0.0.1:13999" -ForegroundColor Green
Write-Host "Backend:       http://127.0.0.1:13310" -ForegroundColor Green
Write-Host "MySQL:         127.0.0.1:13307" -ForegroundColor Green
Write-Host "MinIO API:     http://127.0.0.1:13308" -ForegroundColor Green
Write-Host "MinIO Console: http://127.0.0.1:13309" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: skip npm install if already installed:" -ForegroundColor Yellow
Write-Host "  .\start-local-test.ps1 -SkipInstall" -ForegroundColor Yellow
