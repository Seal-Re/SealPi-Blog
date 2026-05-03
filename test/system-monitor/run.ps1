param([int]$Samples = 60, [int]$Interval = 1)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/../lib/ssh-helpers.ps1"

$resultsDir = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
$ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
$remoteDir = "/tmp/vm-monitor-$ts"

# Upload script.
Invoke-SealpiScpUp -Local "$PSScriptRoot/vm-monitor.sh" -Remote "/tmp/vm-monitor.sh"

# Run.
Invoke-SealpiSsh -Command "chmod +x /tmp/vm-monitor.sh && /tmp/vm-monitor.sh $Samples $Interval $remoteDir"

# Pull artifacts (one explicit call per file — simpler than parameter expansion).
foreach ($f in @('vmstat','iostat','free')) {
    $local = Join-Path $resultsDir "$f-$ts.log"
    Invoke-SealpiScpDown -Remote "$remoteDir/$f.log" -Local $local
}

# Cleanup remote.
Invoke-SealpiSsh -Command "rm -rf $remoteDir"
Write-Host "Wrote $resultsDir/{vmstat,iostat,free}-$ts.log"
