param(
  [switch]$KeepInfra
)

$ErrorActionPreference = "Stop"
if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Stop-ProcessByPort([int]$port) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $listeners) {
    Write-Host "Port $port is already free." -ForegroundColor Gray
    return
  }

  $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $pids) {
    if ($processId -eq $PID) {
      continue
    }
    try {
      $proc = Get-Process -Id $processId -ErrorAction Stop
      Write-Host "Stopping PID $processId ($($proc.ProcessName)) on port $port ..." -ForegroundColor Yellow
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
      Write-Warning "Failed to stop PID ${processId} on port ${port}: $($_.Exception.Message)"
    }
  }
}

function Test-PortInUse([int]$port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendEnvLocal = Join-Path $root ".env.backend.local"
$composeEnvFlag = ""
if (Test-Path $backendEnvLocal) {
  $composeEnvFlag = "--env-file .env.backend.local"
}
Push-Location $root

try {
  Write-Step "Stop local app processes by known ports"
  $appPorts = @(13310, 13999, 13307, 13308, 13309)
  foreach ($port in $appPorts) {
    Stop-ProcessByPort $port
  }

  Write-Step "Stop docker compose services"
  if ($KeepInfra) {
    cmd /c "docker compose $composeEnvFlag stop blog-start minio-init" | Out-Host
    Write-Host "KeepInfra enabled: mysql/minio kept running." -ForegroundColor Gray
  } else {
    cmd /c "docker compose $composeEnvFlag down" | Out-Host
  }

  Write-Step "Stop leftover sealpi containers"
  $containers = docker ps -a --format "{{.Names}}" | Where-Object { $_ -like "sealpi-*" }
  foreach ($name in $containers) {
    try {
      cmd /c "docker rm -f $name" | Out-Null
      Write-Host "Removed container: $name" -ForegroundColor Gray
    } catch {
      Write-Warning "Failed to remove container ${name}: $($_.Exception.Message)"
    }
  }

  Write-Step "Verify known ports are released"
  $stillBusy = @()
  foreach ($port in @(13310, 13999)) {
    if (Test-PortInUse $port) {
      $stillBusy += $port
    }
  }

  if ($stillBusy.Count -gt 0) {
    Write-Warning "Ports still in use: $($stillBusy -join ', ')."
    Write-Host "You can run this to inspect: Get-NetTCPConnection -LocalPort $($stillBusy[0]) -State Listen | Format-List" -ForegroundColor Yellow
    exit 1
  }

  Write-Step "Done"
  Write-Host "All local test services/processes have been stopped." -ForegroundColor Green
  Write-Host "Now you can rerun: .\start-local-test.ps1" -ForegroundColor Green
}
finally {
  Pop-Location
}
