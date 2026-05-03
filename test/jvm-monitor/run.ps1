param(
    [int]$IntervalSec = 1,
    [int]$Samples = 60,
    [string]$Container = 'sealpi-blog-start'
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/../lib/ssh-helpers.ps1"

$resultsDir = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
$ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
$out = Join-Path $resultsDir "jstat-$ts.txt"

# Locate the JVM pid inside the backend container.
# NOTE: $pid is a read-only PowerShell automatic variable — use $javaPid.
$javaPid = Invoke-SealpiSsh -Command "docker exec $Container sh -c 'pgrep -f java | head -n1'"
if (-not $javaPid) { throw "Could not locate Java pid inside container '$Container'." }
$javaPid = $javaPid.Trim()
Write-Host "Java pid in container: $javaPid"

# Check whether jstat is available in the container image.
$jstatPath = Invoke-SealpiSsh -Command "docker exec $Container sh -c 'which jstat 2>/dev/null || echo missing'"
$jstatAvailable = ($jstatPath.Trim() -ne 'missing') -and ($jstatPath.Trim() -ne '')

if ($jstatAvailable) {
    Write-Host "jstat found at $($jstatPath.Trim()) — using jstat -gcutil"
    # Sample with jstat -gcutil from inside the container.
    $cmd = "docker exec $Container jstat -gcutil $javaPid ${IntervalSec}000 $Samples"
    $samples = Invoke-SealpiSsh -Command $cmd
    $samples | Out-File -FilePath $out -Encoding utf8
} else {
    Write-Warning "jstat not found in container '$Container' (slim JRE image — JDK tools stripped)."
    Write-Warning "Falling back to /proc/$javaPid/status snapshots ($Samples samples, ${IntervalSec}s interval)."

    $lines = @()
    $lines += "# jstat unavailable — /proc/$javaPid/status snapshots"
    $lines += "# Container: $Container  |  Java pid: $javaPid  |  Samples: $Samples  |  IntervalSec: $IntervalSec"
    $lines += "# Timestamp                  VmRSS_kB   VmHWM_kB   VmSwap_kB  Threads"
    $lines += "# ------------------------------------------------------------------"

    for ($i = 1; $i -le $Samples; $i++) {
        $statusLines = Invoke-SealpiSsh -Command "docker exec $Container sh -c 'cat /proc/$javaPid/status'"
        $status = ($statusLines -join "`n")
        $rss    = if ($status -match 'VmRSS:\s+(\d+)') { $Matches[1] } else { '?' }
        $hwm    = if ($status -match 'VmHWM:\s+(\d+)') { $Matches[1] } else { '?' }
        $swap   = if ($status -match 'VmSwap:\s+(\d+)') { $Matches[1] } else { '?' }
        $thr    = if ($status -match 'Threads:\s+(\d+)') { $Matches[1] } else { '?' }
        $stamp  = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
        $line   = "{0}  {1,10}  {2,10}  {3,10}  {4,7}" -f $stamp, $rss, $hwm, $swap, $thr
        $lines += $line
        Write-Host $line
        if ($i -lt $Samples) { Start-Sleep -Seconds $IntervalSec }
    }

    $lines | Out-File -FilePath $out -Encoding utf8
}

Write-Host "Wrote $out"
