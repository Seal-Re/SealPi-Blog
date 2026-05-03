$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/../../.."
$backend = Join-Path $root 'sealpi-blog'
$resultsDir = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

Push-Location $backend
try {
    & ./mvnw -q test
    $exit = $LASTEXITCODE
} finally { Pop-Location }

# Gather surefire reports across modules.
Get-ChildItem -Path $backend -Recurse -Filter 'surefire-reports' -Directory | ForEach-Object {
    $dest = Join-Path $resultsDir $_.Parent.Parent.Name
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item -Path "$($_.FullName)\*.xml" -Destination $dest -Force
}

if ($exit -ne 0) { Write-Error "Backend tests failed (exit $exit)"; exit $exit }
Write-Host "Backend test reports collected in $resultsDir"
