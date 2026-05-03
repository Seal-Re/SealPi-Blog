param([int]$Connections = 50, [int]$Duration = 30)

$env:CONNECTIONS = $Connections
$env:DURATION = $Duration
Push-Location $PSScriptRoot/..
try {
    if (-not (Test-Path node_modules)) { npm install --silent }
    foreach ($s in @('articles','feed','tags')) {
        Write-Host "==> autocannon $s ($Connections conns, ${Duration}s)" -ForegroundColor Cyan
        node "scenarios/$s.js"
    }
} finally { Pop-Location }
