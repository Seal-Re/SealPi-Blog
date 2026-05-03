[CmdletBinding()]
param(
    [string]$ResultsDir = (Join-Path $PSScriptRoot '../results'),
    [string]$OutFile
)

# Pick the latest *.json per scenario in $ResultsDir, summarize per-profile and
# per-endpoint metrics into a markdown report. Requires Python on PATH.

$ResultsDir = (Resolve-Path $ResultsDir).Path
if (-not $OutFile) {
    $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
    $OutFile = Join-Path $ResultsDir "PERF-$ts.md"
}

# Inline Python — k6 JSON output is large/complex, walking it in PS is painful.
$py = @"
import json, os, sys
from collections import defaultdict

results_dir = r'''$ResultsDir'''
out_file = r'''$OutFile'''

# Latest JSON per scenario name (file format: <scenario>-<ISO>.json).
latest = {}
for f in os.listdir(results_dir):
    if not f.endswith('.json'):
        continue
    if '-2026' not in f and '-2025' not in f and '-2027' not in f:
        continue
    name, _, ts_with_ext = f.partition('-2026')
    if not ts_with_ext:
        # try other years
        for y in ('2025', '2027'):
            name, _, ts_with_ext = f.partition(f'-{y}')
            if ts_with_ext:
                ts_with_ext = y + ts_with_ext
                break
    else:
        ts_with_ext = '2026' + ts_with_ext
    cur = latest.get(name)
    if cur is None or ts_with_ext > cur[1]:
        latest[name] = (f, ts_with_ext)

if not latest:
    print('No JSON reports found in', results_dir, file=sys.stderr)
    sys.exit(1)

PROFILE_ORDER = ['smoke', 'load', 'stress', 'spike', 'soak']
ENDPOINTS = ['tags', 'list', 'view', 'detail', 'adjacent']

def fmt_ms(v):
    if v is None or v < 0:
        return '-'
    return f'{v:.0f}ms'

def fmt_pct(v):
    if v is None:
        return '-'
    return f'{v*100:.3f}%'

lines = []
lines.append(f'# k6 Performance Report')
lines.append('')
lines.append(f'Source: `{results_dir}` (latest run per profile)')
lines.append('')
lines.append('## Overview')
lines.append('')
lines.append('| Profile | Source file | Reqs | Rate (/s) | Fail | p95 (all) | Thresholds |')
lines.append('|---------|-------------|-----:|----------:|-----:|----------:|:-----------|')

for prof in PROFILE_ORDER:
    if prof not in latest:
        continue
    f = latest[prof][0]
    d = json.load(open(os.path.join(results_dir, f), encoding='utf-8'))
    metrics = d.get('metrics', {})
    dur = metrics.get('http_req_duration', {})
    fail = metrics.get('http_req_failed', {})
    reqs = metrics.get('http_reqs', {})
    p95 = dur.get('values', {}).get('p(95)')
    fail_rate = fail.get('values', {}).get('rate')
    count = reqs.get('values', {}).get('count', 0)
    rate = reqs.get('values', {}).get('rate', 0)

    # Threshold pass/fail summary across all metrics in this run.
    th_pass = 0
    th_fail = 0
    th_breaches = []
    for mname, mdata in metrics.items():
        for tname, tdata in (mdata.get('thresholds') or {}).items():
            if tdata.get('ok'):
                th_pass += 1
            else:
                th_fail += 1
                th_breaches.append(f'{mname} {tname}')
    th_summary = f'{th_pass} OK / {th_fail} FAIL' if th_fail else f'all {th_pass} OK'

    lines.append(f'| {prof} | {f} | {int(count)} | {rate:.1f} | {fmt_pct(fail_rate)} | {fmt_ms(p95)} | {th_summary} |')

# Per-endpoint breakdown (one section per profile that has tagged metrics).
lines.append('')
lines.append('## Per-endpoint latency')
lines.append('')

for prof in PROFILE_ORDER:
    if prof not in latest:
        continue
    f = latest[prof][0]
    d = json.load(open(os.path.join(results_dir, f), encoding='utf-8'))
    metrics = d.get('metrics', {})

    rows = []
    for ep in ENDPOINTS:
        key = f'http_req_duration{{endpoint:{ep}}}'
        m = metrics.get(key)
        if not m:
            continue
        v = m.get('values', {})
        # Pull per-endpoint count from http_reqs{endpoint:X} if present.
        creq = metrics.get(f'http_reqs{{endpoint:{ep}}}', {}).get('values', {}).get('count', 0)
        # Per-endpoint failure rate from http_req_failed{endpoint:X}.
        cfail = metrics.get(f'http_req_failed{{endpoint:{ep}}}', {}).get('values', {}).get('rate')
        # Threshold result.
        th_ok = None
        for tname, tdata in (m.get('thresholds') or {}).items():
            th_ok = tdata.get('ok')
            break
        rows.append((ep, int(creq), v.get('avg'), v.get('med'), v.get('p(90)'), v.get('p(95)'), v.get('max'), cfail, th_ok))

    if not rows:
        continue
    lines.append(f'### {prof}')
    lines.append('')
    lines.append('| Endpoint | Reqs | avg | med | p90 | p95 | max | Fail | Threshold |')
    lines.append('|----------|-----:|----:|----:|----:|----:|----:|-----:|:----------|')
    for ep, n, avg, med, p90, p95, mx, cfail, th_ok in rows:
        th_cell = '-' if th_ok is None else ('OK' if th_ok else 'FAIL')
        lines.append(f'| {ep} | {n} | {fmt_ms(avg)} | {fmt_ms(med)} | {fmt_ms(p90)} | {fmt_ms(p95)} | {fmt_ms(mx)} | {fmt_pct(cfail)} | {th_cell} |')
    lines.append('')

# Threshold breach detail across all profiles.
breaches = []
for prof in PROFILE_ORDER:
    if prof not in latest:
        continue
    f = latest[prof][0]
    d = json.load(open(os.path.join(results_dir, f), encoding='utf-8'))
    for mname, mdata in d.get('metrics', {}).items():
        for tname, tdata in (mdata.get('thresholds') or {}).items():
            if not tdata.get('ok'):
                breaches.append(f'- **{prof}** `{mname}` failed `{tname}`')

if breaches:
    lines.append('## Threshold breaches')
    lines.append('')
    lines.extend(breaches)
    lines.append('')

with open(out_file, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(lines) + '\n')

print(out_file)
"@

$pyFile = Join-Path $env:TEMP "gen-report-$([guid]::NewGuid().Guid).py"
Set-Content -Path $pyFile -Value $py -Encoding UTF8
try {
    & python $pyFile
    if ($LASTEXITCODE -ne 0) { Write-Error 'gen-report.py failed'; exit 1 }
} finally {
    Remove-Item $pyFile -ErrorAction SilentlyContinue
}

Write-Host "Report written to $OutFile"
