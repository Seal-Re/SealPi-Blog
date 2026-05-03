[CmdletBinding()]
param(
    [string]$BaseUrl = 'https://blog.sealpi.cn',
    [int]$MaxVu = 200,
    [string[]]$Profiles,
    [switch]$IncludeSoak,
    [switch]$OnlySoak
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/.."

# Profile selection precedence: -Profiles > -OnlySoak > (default + -IncludeSoak)
if ($Profiles -and $Profiles.Count -gt 0) {
    $selected = $Profiles
}
elseif ($OnlySoak) {
    $selected = @('soak')
}
else {
    $selected = @('smoke', 'load', 'stress', 'spike')
    if ($IncludeSoak) { $selected += 'soak' }
}

# Ensure pool exists.
$pool = Join-Path $root 'data/pool.json'
if (-not (Test-Path $pool)) {
    Write-Host '[run-all] pool missing, running bootstrap...'
    & "$PSScriptRoot/bootstrap.ps1" -BaseUrl $BaseUrl
    if ($LASTEXITCODE -ne 0) { throw 'bootstrap failed' }
}

Push-Location $root
try {
    foreach ($p in $selected) {
        $script = "scenarios/$p.js"
        if (-not (Test-Path $script)) {
            Write-Warning "skip: $script not found"
            continue
        }
        Write-Host "===== $p ====="
        # Pass env via -e to keep launcher hermetic (no shell-scope leak).
        & k6 run -e "BASE_URL=$BaseUrl" -e "MAX_VU=$MaxVu" -e "SCENARIO=$p" $script
        $exit = $LASTEXITCODE
        Write-Host "[$p] exit=$exit"
        # k6 returns non-zero on threshold breach (expected for stress break-point); continue.
    }
}
finally {
    Pop-Location
}

Write-Host 'All requested profiles finished. Reports in test/k6/results/.'
