$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/../.."
$bench = Join-Path $root 'sealpi-blog/blog-bench/target/benchmarks.jar'
$resultsDir = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

Push-Location (Join-Path $root 'sealpi-blog')
try {
    & ./mvnw -P bench -pl blog-bench -am clean package -DskipTests
} finally { Pop-Location }

if (-not (Test-Path $bench)) { throw "benchmarks.jar not produced at $bench" }

$ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
$out = Join-Path $resultsDir "jmh-$ts.json"
& java -jar $bench -rf json -rff $out
Write-Host "Wrote $out"
