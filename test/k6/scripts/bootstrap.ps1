[CmdletBinding()]
param(
    [switch]$Force,
    [string]$BaseUrl = 'https://blog.sealpi.cn',
    [int]$PoolSize = 30
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/.."
$pool = Join-Path $root 'data/pool.json'

if ((Test-Path $pool) -and -not $Force) {
    Write-Host "Pool exists at $pool. Use -Force to regenerate."
    exit 0
}

Push-Location $root
try {
    & k6 run -e "BASE_URL=$BaseUrl" -e "POOL_SIZE=$PoolSize" scenarios/bootstrap.js
    if ($LASTEXITCODE -ne 0) { throw "k6 bootstrap failed (exit $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

# Belt-and-suspenders: k6 may exit 0 without writing pool.json
# (e.g., handleSummary key typo or wrong CWD), so verify the file actually landed.
if (-not (Test-Path $pool)) {
    throw "Bootstrap completed but $pool was not written. Backend may have returned zero articles."
}

Write-Host "Pool written to $pool"
