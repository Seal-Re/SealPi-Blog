$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker compose up -d
    Write-Host "Waiting for mysql healthy..."
    docker compose exec -T mysql sh -c 'until mysqladmin ping -h 127.0.0.1 -uroot -pbench --silent; do sleep 1; done'

    $resultsDir = Join-Path $PSScriptRoot 'results'
    New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
    $ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
    $out = Join-Path $resultsDir "sysbench-$ts.txt"

    $common = @(
        '--db-driver=mysql',
        '--mysql-host=mysql',
        '--mysql-port=3306',
        '--mysql-user=root',
        '--mysql-password=bench',
        '--mysql-db=sbtest',
        '--tables=4',
        '--table-size=200000',
        '--threads=8',
        '--time=60',
        '--report-interval=5'
    )

    docker compose exec -T sysbench sysbench oltp_read_write @common prepare 2>&1 | Tee-Object -FilePath $out
    docker compose exec -T sysbench sysbench oltp_read_write @common run 2>&1 | Tee-Object -FilePath $out -Append
    docker compose exec -T sysbench sysbench oltp_read_write @common cleanup 2>&1 | Tee-Object -FilePath $out -Append

    Write-Host "Wrote $out"
} finally {
    docker compose down -v
    Pop-Location
}
