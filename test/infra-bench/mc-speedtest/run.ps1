$ErrorActionPreference = 'Continue'
Push-Location $PSScriptRoot
try {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

    docker compose exec -T mc mc alias set local http://minio:9000 bench benchbench
    if ($LASTEXITCODE -ne 0) { throw "mc alias set failed" }

    $resultsDir = Join-Path $PSScriptRoot 'results'
    New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
    $ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
    $out = Join-Path $resultsDir "mc-$ts.txt"

    Write-Host "Attempting mc admin speedtest..." -ForegroundColor Cyan
    $speedtestOutput = docker compose exec -T mc mc admin speedtest local 2>&1
    $speedtestExit = $LASTEXITCODE
    $speedtestOutput | Tee-Object -FilePath $out

    if ($speedtestExit -ne 0) {
        Write-Host "Speedtest unsupported on single-node — running fallback PUT/GET timing" -ForegroundColor Yellow
        "=== FALLBACK: PUT/GET timing ===" | Tee-Object -FilePath $out -Append
        docker compose exec -T mc mc mb local/bench 2>&1 | Tee-Object -FilePath $out -Append
        foreach ($size in @('1', '10', '100')) {
            "--- ${size}MiB ---" | Tee-Object -FilePath $out -Append
            docker compose exec -T mc sh -c "dd if=/dev/urandom of=/tmp/bench-${size}m bs=1M count=$size 2>/dev/null; time mc cp /tmp/bench-${size}m local/bench/; time mc cp local/bench/bench-${size}m /tmp/bench-${size}m.dl; rm /tmp/bench-${size}m /tmp/bench-${size}m.dl" 2>&1 | Tee-Object -FilePath $out -Append
        }
        docker compose exec -T mc mc rb --force local/bench 2>&1 | Tee-Object -FilePath $out -Append
    }

    Write-Host "Wrote $out" -ForegroundColor Green
} finally {
    docker compose down -v
    Pop-Location
}
