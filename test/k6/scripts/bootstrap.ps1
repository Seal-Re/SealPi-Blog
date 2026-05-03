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

$env:BASE_URL = $BaseUrl
$env:POOL_SIZE = "$PoolSize"

Push-Location $root
try {
    & k6 run scenarios/bootstrap.js
    if ($LASTEXITCODE -ne 0) { throw "k6 bootstrap failed (exit $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

Write-Host "Pool written to $pool"
