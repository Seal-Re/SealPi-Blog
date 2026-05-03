$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/../../.."
$frontend = Join-Path $root 'tailwind-nextjs-starter-blog-sealpi'
$resultsDir = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
$ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
$out = Join-Path $resultsDir "vitest-$ts.json"

Push-Location $frontend
try {
    if (-not (Test-Path node_modules)) { npm ci --silent }
    & npx vitest run --reporter=json --outputFile=$out
    $exit = $LASTEXITCODE
} finally { Pop-Location }

if ($exit -ne 0) { Write-Error "Vitest failed (exit $exit)"; exit $exit }
Write-Host "Wrote $out"
