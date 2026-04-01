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

function Wait-MySqlContainerReady([int]$maxWaitSec = 90, [int]$stepSec = 5) {
  Write-Step "Wait for MySQL container readiness (mysqladmin ping)"
  $waited = 0
  while ($waited -lt $maxWaitSec) {
    $null = docker compose exec -T -e MYSQL_PWD=root mysql mysqladmin ping -h localhost -u root 2>&1
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

$servicePorts = @(13310, 13311)

Write-Step "Check required commands"
Assert-Command "docker" "Install and start Docker Desktop first."
Assert-Command "npm" "Install Node.js (20+) first."
Assert-Command "java" "Install JDK 21 first."

Write-Step "Check service port availability (13310/13311)"
Assert-PortAvailable $servicePorts

Write-Step "Start infrastructure (MySQL/MinIO)"
Push-Location $root
docker compose up -d mysql minio minio-init | Out-Host
Pop-Location

Push-Location $root
Wait-MySqlContainerReady
Pop-Location

Write-Step "Verify host TCP connectivity to MySQL (127.0.0.1:13307)"
if (-not (Test-TcpConnect "127.0.0.1" 13307)) {
  throw "MySQL container is ready but host cannot connect to 127.0.0.1:13307. Check firewall/port proxy and run: docker compose ps"
}

Write-Step "Patch frontend .env.local (preserve existing OAuth config)"
Set-EnvValueInFile $frontendEnvLocal "NEXT_PUBLIC_BLOG_API_BASE_URL" "http://127.0.0.1:13310"
Set-EnvValueInFile $frontendEnvLocal "AUTH_URL" "http://localhost:13311"
Set-EnvValueInFile $frontendEnvLocal "NEXTAUTH_URL" "http://localhost:13311"
$authSecret = Get-EnvValueFromFile $frontendEnvLocal "AUTH_SECRET"
if ([string]::IsNullOrWhiteSpace($authSecret)) {
  $authSecret = [guid]::NewGuid().ToString()
  Set-EnvValueInFile $frontendEnvLocal "AUTH_SECRET" $authSecret
  Write-Host "Generated AUTH_SECRET in .env.local" -ForegroundColor Gray
} else {
  Write-Host "Reuse existing AUTH_SECRET in .env.local" -ForegroundColor Gray
}

Write-Step "Validate GitHub OAuth configuration"
$githubId = Get-EnvValueFromFile $frontendEnvLocal "GITHUB_ID"
$githubSecret = Get-EnvValueFromFile $frontendEnvLocal "GITHUB_SECRET"

if ([string]::IsNullOrWhiteSpace($githubId)) {
  $inputGithubId = Read-Host "Missing GITHUB_ID. Please input your GitHub OAuth Client ID"
  if ([string]::IsNullOrWhiteSpace($inputGithubId)) {
    throw "GITHUB_ID is still empty. Abort."
  }
  Set-EnvValueInFile $frontendEnvLocal "GITHUB_ID" $inputGithubId.Trim()
  $githubId = $inputGithubId.Trim()
}

if ([string]::IsNullOrWhiteSpace($githubSecret)) {
  $inputGithubSecret = Read-Host "Missing GITHUB_SECRET. Please input your GitHub OAuth Client Secret"
  if ([string]::IsNullOrWhiteSpace($inputGithubSecret)) {
    throw "GITHUB_SECRET is still empty. Abort."
  }
  Set-EnvValueInFile $frontendEnvLocal "GITHUB_SECRET" $inputGithubSecret.Trim()
  $githubSecret = $inputGithubSecret.Trim()
}

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
`$env:SPRING_DATASOURCE_URL='jdbc:mysql://127.0.0.1:13307/sealpi_blog?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai'
`$env:SPRING_DATASOURCE_USERNAME='root'
`$env:SPRING_DATASOURCE_PASSWORD='root'
`$env:ADMIN_JWT_SECRET='e4b7b2f4c9a0d8e1f5b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
`$env:ADMIN_GITHUB_USERIDS='12345'
`$env:ADMIN_JWT_GITHUBUSERIDCLAIM='githubUserId'
`$env:ADMIN_UPLOAD_MINIO_ENDPOINT='http://127.0.0.1:13308'
`$env:ADMIN_UPLOAD_MINIO_ACCESSKEY='minioadmin'
`$env:ADMIN_UPLOAD_MINIO_SECRETKEY='minioadmin'
`$env:ADMIN_UPLOAD_MINIO_BUCKET='blog-assets'
`$env:ADMIN_UPLOAD_PUBLICBASEURL='http://127.0.0.1:13308'
`$env:SERVER_PORT='13310'
Set-Location "$backendDir"
.\mvnw.cmd -f "$backendDir\blog-start\pom.xml" spring-boot:run
"@
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendCommand) | Out-Null

Write-Step "Start frontend on 13311"
$frontendCommand = @"
Set-Location "$frontendDir"
npx next dev -p 13311
"@
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendCommand) | Out-Null

Write-Step "All done"
Write-Host "Frontend:      http://127.0.0.1:13311" -ForegroundColor Green
Write-Host "Backend:       http://127.0.0.1:13310" -ForegroundColor Green
Write-Host "MySQL:         127.0.0.1:13307" -ForegroundColor Green
Write-Host "MinIO API:     http://127.0.0.1:13308" -ForegroundColor Green
Write-Host "MinIO Console: http://127.0.0.1:13309" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: skip npm install if already installed:" -ForegroundColor Yellow
Write-Host "  .\start-local-test.ps1 -SkipInstall" -ForegroundColor Yellow
