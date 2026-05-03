# k6 Load Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build five k6 load-test profiles (smoke / load / stress / spike / soak) for `https://blog.sealpi.cn` public API, with real-data pool prefetch, per-profile thresholds, HTML+JSON output, and VM-side monitoring helper.

**Architecture:** A `lib/` of reusable modules (config, pool, thresholds, weighted endpoint picker, custom summary) consumed by per-profile scenario files in `scenarios/`. A bootstrap scenario fetches real article ids/slugs/tags from the live API and writes `data/pool.json`; load scenarios load that pool via k6 `SharedArray`. PowerShell launchers wrap common runs; a Linux shell script handles JVM/host monitoring on the target VM during soak runs.

**Tech Stack:** k6 (JS scenarios, ESM), `k6-html-reporter` (jslib CDN), PowerShell 5.1+ launchers, bash for VM monitor.

**Spec:** `docs/superpowers/specs/2026-05-03-k6-load-testing-design.md`

**Working dir:** `test/k6/` (project root: `D:\AgentWorkStation\SealPi-Blog`).

**Pre-flight:** k6 CLI must be installed (`k6 version` succeeds). If missing on Windows: `winget install k6 --source winget` or `choco install k6`. Backend at `https://blog.sealpi.cn` must be reachable and have at least one published article + one tag.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `test/k6/.gitignore` | Ignore `data/pool.json` and `results/` |
| `test/k6/lib/config.js` | Read env (`BASE_URL`, `POOL_SIZE`, `MAX_VU`, `SCENARIO`); export defaults |
| `test/k6/lib/pool.js` | Load `data/pool.json` into `SharedArray`; expose `articles`, `tags`, `pickArticle()`, `pickTag()` |
| `test/k6/lib/thresholds.js` | Per-profile thresholds map |
| `test/k6/lib/weighted-pick.js` | Endpoint functions + weighted dispatcher; one call per VU iteration |
| `test/k6/lib/summary.js` | `handleSummary` factory: stdout text + JSON + HTML to `results/` |
| `test/k6/scenarios/bootstrap.js` | One-shot: prefetch articles/tags → `data/pool.json` |
| `test/k6/scenarios/smoke.js` | 1 VU / 30s constant |
| `test/k6/scenarios/load.js` | Ramp 0→20→0, 5 min |
| `test/k6/scenarios/stress.js` | Step ramp +20 VU/min to `MAX_VU`, abortOnFail |
| `test/k6/scenarios/spike.js` | 5→100→5 burst |
| `test/k6/scenarios/soak.js` | 10 VU / 30 min constant |
| `test/k6/scripts/bootstrap.ps1` | Run bootstrap.js (skip if pool exists, `-Force` to regenerate) |
| `test/k6/scripts/run-all.ps1` | Sequential runner; flags `-IncludeSoak`, `-OnlySoak`, `-Profiles smoke,load,...` |
| `test/k6/scripts/vm-monitor.sh` | Linux: jstat/top/vmstat for given Java pid + duration |
| `test/k6/README.md` | Usage, env vars, soak pre-flight checklist, stress upper-bound tuning |

---

## Verification Strategy

k6 scripts are themselves test runners — TDD doesn't map directly. Instead, each task ends with a **smoke run** that proves the new code is syntactically valid and behaves as designed. We use `k6 run --duration 5s --vus 1` to validate scenarios cheaply against the live API, and `k6 inspect` for syntax-only checks where a live run is wasteful.

For lib modules, validation is via the first scenario that consumes them.

---

## Task 1: Project Skeleton & Config

**Files:**
- Create: `test/k6/.gitignore`
- Create: `test/k6/lib/config.js`

- [ ] **Step 1: Verify k6 installed**

Run (PowerShell): `k6 version`
Expected: prints version like `k6 v0.50.0 (...)`. If not installed, install per pre-flight, then re-run.

- [ ] **Step 2: Create directory skeleton**

Run (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path test/k6/lib, test/k6/scenarios, test/k6/scripts, test/k6/data, test/k6/results | Out-Null
```

- [ ] **Step 3: Write `.gitignore`**

Create `test/k6/.gitignore`:
```
data/pool.json
results/
```

- [ ] **Step 4: Write `lib/config.js`**

Create `test/k6/lib/config.js`:
```js
// Centralized config read from env. k6 exposes env via __ENV.
export const BASE_URL = __ENV.BASE_URL || 'https://blog.sealpi.cn';
export const POOL_SIZE = parseInt(__ENV.POOL_SIZE || '30', 10);
export const MAX_VU = parseInt(__ENV.MAX_VU || '200', 10);
export const SCENARIO = __ENV.SCENARIO || 'unnamed';

export const HTTP_DEFAULTS = {
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'k6-loadtest/1.0 (+blog.sealpi.cn)',
  },
  timeout: '30s',
};
```

- [ ] **Step 5: Commit**

```bash
git add test/k6/.gitignore test/k6/lib/config.js
git commit -m "test(k6): add project skeleton and config module"
```

---

## Task 2: Bootstrap Scenario (Real Data Pool)

**Files:**
- Create: `test/k6/scenarios/bootstrap.js`
- Create: `test/k6/scripts/bootstrap.ps1`

- [ ] **Step 1: Write `scenarios/bootstrap.js`**

Create `test/k6/scenarios/bootstrap.js`:
```js
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, POOL_SIZE, HTTP_DEFAULTS } from '../lib/config.js';

export const options = {
  scenarios: {
    bootstrap: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const articles = [];
  const pageSize = 20;
  let page = 1;

  // Page through /api/v1/articles until POOL_SIZE collected or exhausted.
  while (articles.length < POOL_SIZE) {
    const res = http.get(`${BASE_URL}/api/v1/articles?pageIndex=${page}&pageSize=${pageSize}`, HTTP_DEFAULTS);
    check(res, { 'list 200': (r) => r.status === 200 });
    if (res.status !== 200) break;

    const body = res.json();
    // Backend returns Response<PageResponse<ArticleVO>>; data shape: { data: [...], total, ... }
    const items = (body && body.data && body.data.data) || [];
    if (items.length === 0) break;

    for (const it of items) {
      if (articles.length >= POOL_SIZE) break;
      if (!it.url || it.id == null) continue;
      articles.push({
        id: it.id,
        slug: it.url,
        tags: Array.isArray(it.tags) ? it.tags : [],
      });
    }
    if (items.length < pageSize) break;
    page += 1;
  }

  // Tags: GET /api/v1/tags returns Response<[{ tagId, name, count }]>
  const tagRes = http.get(`${BASE_URL}/api/v1/tags`, HTTP_DEFAULTS);
  check(tagRes, { 'tags 200': (r) => r.status === 200 });
  const tagBody = tagRes.json();
  const tags = ((tagBody && tagBody.data) || []).map((t) => t.name).filter(Boolean);

  if (articles.length === 0) {
    throw new Error('Bootstrap failed: zero published articles found');
  }

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    articles,
    tags,
  };

  // k6 cannot write files at runtime from default(); use handleSummary.
  globalThis.__POOL__ = out;
}

export function handleSummary() {
  const pool = globalThis.__POOL__;
  if (!pool) {
    return { stdout: 'Bootstrap aborted: no pool collected\n' };
  }
  return {
    'stdout': `Bootstrap OK: ${pool.articles.length} articles, ${pool.tags.length} tags\n`,
    'data/pool.json': JSON.stringify(pool, null, 2),
  };
}
```

- [ ] **Step 2: Write `scripts/bootstrap.ps1`**

Create `test/k6/scripts/bootstrap.ps1`:
```powershell
[CmdletBinding()]
param(
    [switch]$Force,
    [string]$BaseUrl = 'https://blog.sealpi.cn',
    [int]$PoolSize = 30
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/.."
$pool = Join-Path $root 'data/pool.json'

if ((Test-Path $pool) -and -not $Force) {
    Write-Host "Pool exists at $pool. Use -Force to regenerate."
    exit 0
}

$env:BASE_URL = $BaseUrl
$env:POOL_SIZE = "$PoolSize"

Push-Location $root
try {
    & k6 run scenarios/bootstrap.js
    if ($LASTEXITCODE -ne 0) { throw "k6 bootstrap failed (exit $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

Write-Host "Pool written to $pool"
```

- [ ] **Step 3: Run bootstrap and verify**

Run (PowerShell, from project root):
```powershell
pwsh test/k6/scripts/bootstrap.ps1 -Force
```
Expected: k6 prints `Bootstrap OK: <n> articles, <m> tags` (n>=1, m>=0). File `test/k6/data/pool.json` is created. Open it, confirm `articles[0].id`, `articles[0].slug` are populated.

- [ ] **Step 4: Verify idempotent skip without -Force**

Run: `pwsh test/k6/scripts/bootstrap.ps1`
Expected: prints `Pool exists at ... Use -Force to regenerate.` and exits 0 without invoking k6.

- [ ] **Step 5: Commit**

```bash
git add test/k6/scenarios/bootstrap.js test/k6/scripts/bootstrap.ps1
git commit -m "test(k6): add bootstrap scenario and launcher for real-data pool"
```

---

## Task 3: Pool Loader, Thresholds, Weighted Picker

**Files:**
- Create: `test/k6/lib/pool.js`
- Create: `test/k6/lib/thresholds.js`
- Create: `test/k6/lib/weighted-pick.js`

- [ ] **Step 1: Write `lib/pool.js`**

Create `test/k6/lib/pool.js`:
```js
import { SharedArray } from 'k6/data';

const raw = new SharedArray('pool', () => {
  const data = JSON.parse(open('../data/pool.json'));
  return [data];
});

const pool = raw[0];

export const articles = new SharedArray('articles', () => pool.articles);
export const tags = new SharedArray('tags', () => pool.tags);

export function pickArticle() {
  return articles[Math.floor(Math.random() * articles.length)];
}

export function pickTag() {
  if (tags.length === 0) return null;
  return tags[Math.floor(Math.random() * tags.length)];
}
```

- [ ] **Step 2: Write `lib/thresholds.js`**

Create `test/k6/lib/thresholds.js`:
```js
export const thresholds = {
  smoke: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<2000'],
  },
  load: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<500', 'p(99)<1500'],
  },
  stress: {
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' },
    ],
    'http_req_duration': [
      { threshold: 'p(99)<1000', abortOnFail: true, delayAbortEval: '30s' },
    ],
  },
  spike: {
    'http_req_failed': ['rate<0.10'],
  },
  soak: {
    'http_req_failed': ['rate<0.005'],
    'http_req_duration': ['p(95)<600'],
  },
};
```

- [ ] **Step 3: Write `lib/weighted-pick.js`**

Create `test/k6/lib/weighted-pick.js`:
```js
import http from 'k6/http';
import { group, check } from 'k6';
import { BASE_URL, HTTP_DEFAULTS } from './config.js';
import { pickArticle } from './pool.js';

function hitList() {
  group('list', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles?pageIndex=1&pageSize=10`, HTTP_DEFAULTS);
    check(res, { 'list 200': (r) => r.status === 200 });
  });
}

function hitDetailSlug() {
  const a = pickArticle();
  group('detail_slug', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles/slug/${encodeURIComponent(a.slug)}`, HTTP_DEFAULTS);
    check(res, { 'detail 200': (r) => r.status === 200 });
  });
}

function hitAdjacent() {
  const a = pickArticle();
  const tagParams = (a.tags || []).map((t) => `&tags=${encodeURIComponent(t)}`).join('');
  group('adjacent', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles/adjacent?slug=${encodeURIComponent(a.slug)}${tagParams}`, HTTP_DEFAULTS);
    check(res, { 'adjacent 200': (r) => r.status === 200 });
  });
}

function hitTags() {
  group('tags', () => {
    const res = http.get(`${BASE_URL}/api/v1/tags`, HTTP_DEFAULTS);
    check(res, { 'tags 200': (r) => r.status === 200 });
  });
}

function hitViewPost() {
  const a = pickArticle();
  group('view_post', () => {
    const res = http.post(`${BASE_URL}/api/v1/articles/${a.id}/view`, null, HTTP_DEFAULTS);
    // view endpoint is no-op-on-error per backend contract; accept 200/204
    check(res, { 'view 2xx': (r) => r.status >= 200 && r.status < 300 });
  });
}

const weighted = [
  { fn: hitList,       w: 50 },
  { fn: hitDetailSlug, w: 30 },
  { fn: hitAdjacent,   w: 10 },
  { fn: hitTags,       w:  5 },
  { fn: hitViewPost,   w:  5 },
];

const totalWeight = weighted.reduce((s, x) => s + x.w, 0);

export function runWeighted() {
  let r = Math.random() * totalWeight;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) {
      item.fn();
      return;
    }
  }
  weighted[0].fn();
}
```

- [ ] **Step 4: Commit**

```bash
git add test/k6/lib/pool.js test/k6/lib/thresholds.js test/k6/lib/weighted-pick.js
git commit -m "test(k6): add pool loader, thresholds, and weighted endpoint dispatcher"
```

---

## Task 4: Summary Module (JSON + HTML output)

**Files:**
- Create: `test/k6/lib/summary.js`

- [ ] **Step 1: Write `lib/summary.js`**

Create `test/k6/lib/summary.js`:
```js
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { SCENARIO } from './config.js';

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function makeHandleSummary(opts = {}) {
  const name = opts.scenario || SCENARIO;
  return function handleSummary(data) {
    const stamp = ts();
    return {
      'stdout': textSummary(data, { indent: ' ', enableColors: true }),
      [`results/${name}-${stamp}.json`]: JSON.stringify(data, null, 2),
      [`results/${name}-${stamp}.html`]: htmlReport(data, { title: `k6 ${name} ${stamp}` }),
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add test/k6/lib/summary.js
git commit -m "test(k6): add summary module emitting stdout + JSON + HTML"
```

---

## Task 5: Smoke Scenario

**Files:**
- Create: `test/k6/scenarios/smoke.js`

- [ ] **Step 1: Write `scenarios/smoke.js`**

Create `test/k6/scenarios/smoke.js`:
```js
import { runWeighted } from '../lib/weighted-pick.js';
import { thresholds } from '../lib/thresholds.js';
import { makeHandleSummary } from '../lib/summary.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
    },
  },
  thresholds: thresholds.smoke,
};

export default function () {
  runWeighted();
}

export const handleSummary = makeHandleSummary({ scenario: 'smoke' });
```

- [ ] **Step 2: Verify pool exists, then run smoke**

Run (PowerShell, from project root):
```powershell
if (-not (Test-Path test/k6/data/pool.json)) { pwsh test/k6/scripts/bootstrap.ps1 }
$env:SCENARIO = 'smoke'
Push-Location test/k6
k6 run scenarios/smoke.js
Pop-Location
```
Expected: k6 runs 30s, all checks pass, `http_req_failed` rate near 0, `results/smoke-<ts>.json` and `results/smoke-<ts>.html` created.

- [ ] **Step 3: Open HTML report and confirm**

Run: `Invoke-Item (Get-ChildItem test/k6/results/smoke-*.html | Sort-Object LastWriteTime -Descending | Select-Object -First 1)`
Expected: browser opens; report shows request totals, latency percentiles, and per-group breakdown (list, detail_slug, adjacent, tags, view_post).

- [ ] **Step 4: Commit**

```bash
git add test/k6/scenarios/smoke.js
git commit -m "test(k6): add smoke scenario (1 vu / 30s)"
```

---

## Task 6: Load Scenario

**Files:**
- Create: `test/k6/scenarios/load.js`

- [ ] **Step 1: Write `scenarios/load.js`**

Create `test/k6/scenarios/load.js`:
```js
import { runWeighted } from '../lib/weighted-pick.js';
import { thresholds } from '../lib/thresholds.js';
import { makeHandleSummary } from '../lib/summary.js';

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '4m',  target: 20 },
        { duration: '30s', target: 0  },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: thresholds.load,
};

export default function () {
  runWeighted();
}

export const handleSummary = makeHandleSummary({ scenario: 'load' });
```

- [ ] **Step 2: Quick syntax check (no full 5-min run yet)**

Run (PowerShell):
```powershell
Push-Location test/k6
k6 inspect scenarios/load.js
Pop-Location
```
Expected: prints scenario summary (executor, stages totals); no parse errors. Full run is exercised by `run-all.ps1` later.

- [ ] **Step 3: Commit**

```bash
git add test/k6/scenarios/load.js
git commit -m "test(k6): add load scenario (ramp 0->20 vu, 5 min)"
```

---

## Task 7: Stress Scenario with Break-Point Detection

**Files:**
- Create: `test/k6/scenarios/stress.js`

- [ ] **Step 1: Write `scenarios/stress.js`**

Create `test/k6/scenarios/stress.js`:
```js
import { runWeighted } from '../lib/weighted-pick.js';
import { thresholds } from '../lib/thresholds.js';
import { makeHandleSummary } from '../lib/summary.js';
import { MAX_VU } from '../lib/config.js';

// Step ramp: +20 VU per minute up to MAX_VU.
function buildStages(maxVu) {
  const stages = [];
  for (let vu = 20; vu <= maxVu; vu += 20) {
    stages.push({ duration: '1m', target: vu });
  }
  return stages;
}

const stages = buildStages(MAX_VU);
const expectedDurationSec = stages.length * 60;

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages,
      gracefulRampDown: '15s',
    },
  },
  thresholds: thresholds.stress,
};

export default function () {
  runWeighted();
}

const baseSummary = makeHandleSummary({ scenario: 'stress' });

export function handleSummary(data) {
  const out = baseSummary(data);
  const actualSec = (data.state && data.state.testRunDurationMs)
    ? data.state.testRunDurationMs / 1000
    : 0;
  const aborted = actualSec > 0 && actualSec < expectedDurationSec - 5;

  let breakAt = null;
  if (aborted) {
    // Last completed stage = floor(actualSec / 60), VU at that stage = (idx+1)*20
    const idx = Math.max(0, Math.floor(actualSec / 60) - 1);
    breakAt = (idx + 1) * 20;
  }

  const note = aborted
    ? `\n=== STRESS BREAK_AT_VU=${breakAt} (aborted at ${actualSec.toFixed(1)}s of ${expectedDurationSec}s expected) ===\n`
    : `\n=== STRESS COMPLETED MAX_VU=${MAX_VU} stable. Re-run with MAX_VU=$((MAX_VU * 2)) to find break point. ===\n`;

  out.stdout = (out.stdout || '') + note;
  return out;
}
```

- [ ] **Step 2: Syntax check**

Run (PowerShell):
```powershell
Push-Location test/k6
k6 inspect scenarios/stress.js
Pop-Location
```
Expected: prints stages summary with 10 stages (20, 40, ..., 200 VU) at default MAX_VU. No parse errors.

- [ ] **Step 3: Commit**

```bash
git add test/k6/scenarios/stress.js
git commit -m "test(k6): add stress scenario with abortOnFail break-point detection"
```

---

## Task 8: Spike Scenario

**Files:**
- Create: `test/k6/scenarios/spike.js`

- [ ] **Step 1: Write `scenarios/spike.js`**

Create `test/k6/scenarios/spike.js`:
```js
import { runWeighted } from '../lib/weighted-pick.js';
import { thresholds } from '../lib/thresholds.js';
import { makeHandleSummary } from '../lib/summary.js';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5   },  // warm-up baseline
        { duration: '30s', target: 100 },  // spike up
        { duration: '30s', target: 100 },  // hold spike
        { duration: '60s', target: 5   },  // recover
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: thresholds.spike,
};

export default function () {
  runWeighted();
}

export const handleSummary = makeHandleSummary({ scenario: 'spike' });
```

- [ ] **Step 2: Syntax check**

Run (PowerShell):
```powershell
Push-Location test/k6
k6 inspect scenarios/spike.js
Pop-Location
```
Expected: prints spike stages summary; no parse errors.

- [ ] **Step 3: Commit**

```bash
git add test/k6/scenarios/spike.js
git commit -m "test(k6): add spike scenario (5->100->5 VU burst)"
```

---

## Task 9: Soak Scenario

**Files:**
- Create: `test/k6/scenarios/soak.js`

- [ ] **Step 1: Write `scenarios/soak.js`**

Create `test/k6/scenarios/soak.js`:
```js
import { runWeighted } from '../lib/weighted-pick.js';
import { thresholds } from '../lib/thresholds.js';
import { makeHandleSummary } from '../lib/summary.js';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30m',
    },
  },
  thresholds: thresholds.soak,
};

export default function () {
  runWeighted();
}

export const handleSummary = makeHandleSummary({ scenario: 'soak' });
```

- [ ] **Step 2: Syntax check**

Run (PowerShell):
```powershell
Push-Location test/k6
k6 inspect scenarios/soak.js
Pop-Location
```
Expected: prints soak summary (10 VU, 30m); no parse errors.

- [ ] **Step 3: Commit**

```bash
git add test/k6/scenarios/soak.js
git commit -m "test(k6): add soak scenario (10 vu / 30m)"
```

---

## Task 10: VM Monitor Shell Script

**Files:**
- Create: `test/k6/scripts/vm-monitor.sh`

- [ ] **Step 1: Write `scripts/vm-monitor.sh`**

Create `test/k6/scripts/vm-monitor.sh`:
```bash
#!/usr/bin/env bash
# Monitor JVM + host during a k6 soak run.
# Usage: ./vm-monitor.sh <java-pid> <duration-seconds>
# Output: logs/{jstat,top,vmstat}-<timestamp>.log
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <java-pid> <duration-seconds>" >&2
  exit 2
fi

PID="$1"
DUR="$2"

if ! kill -0 "$PID" 2>/dev/null; then
  echo "PID $PID not running" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

echo "Monitoring pid=$PID for ${DUR}s; logs -> $(pwd)/$LOG_DIR/*-$TS.log"

jstat -gcutil "$PID" 5000 > "$LOG_DIR/jstat-$TS.log" &
JSTAT_PID=$!

top -b -d 5 -p "$PID" > "$LOG_DIR/top-$TS.log" &
TOP_PID=$!

vmstat 5 > "$LOG_DIR/vmstat-$TS.log" &
VMSTAT_PID=$!

cleanup() {
  kill "$JSTAT_PID" "$TOP_PID" "$VMSTAT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep "$DUR"
cleanup
echo "Done. Logs in $(pwd)/$LOG_DIR/"
```

- [ ] **Step 2: Sanity check (Windows: just ensure file syntax-valid via bash if available)**

Run (PowerShell):
```powershell
bash -n test/k6/scripts/vm-monitor.sh
```
Expected: no output, exit 0. If `bash` not available on Windows, skip this step — the script will be validated when copied to the VM.

- [ ] **Step 3: Commit**

```bash
git add test/k6/scripts/vm-monitor.sh
git commit -m "test(k6): add VM-side monitor script (jstat + top + vmstat)"
```

---

## Task 11: Run-All Launcher

**Files:**
- Create: `test/k6/scripts/run-all.ps1`

- [ ] **Step 1: Write `scripts/run-all.ps1`**

Create `test/k6/scripts/run-all.ps1`:
```powershell
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

$env:BASE_URL = $BaseUrl
$env:MAX_VU = "$MaxVu"

Push-Location $root
try {
    foreach ($p in $selected) {
        $script = "scenarios/$p.js"
        if (-not (Test-Path $script)) {
            Write-Warning "skip: $script not found"
            continue
        }
        Write-Host "===== $p ====="
        $env:SCENARIO = $p
        & k6 run $script
        $exit = $LASTEXITCODE
        Write-Host "[$p] exit=$exit"
        # k6 returns non-zero on threshold breach (expected for stress break-point); continue.
    }
}
finally {
    Pop-Location
}

Write-Host 'All requested profiles finished. Reports in test/k6/results/.'
```

- [ ] **Step 2: Run smoke profile only via launcher**

Run (PowerShell, from project root):
```powershell
pwsh test/k6/scripts/run-all.ps1 -Profiles smoke
```
Expected: prints `===== smoke =====`, k6 runs 30s smoke, exits 0, new `results/smoke-*.html` and `*.json` files appear.

- [ ] **Step 3: Commit**

```bash
git add test/k6/scripts/run-all.ps1
git commit -m "test(k6): add run-all.ps1 launcher with profile selection flags"
```

---

## Task 12: README

**Files:**
- Create: `test/k6/README.md`

- [ ] **Step 1: Write `README.md`**

Create `test/k6/README.md`:
```markdown
# k6 Load Tests — blog.sealpi.cn

Five profiles against the public API: **smoke**, **load**, **stress**, **spike**, **soak**.

See design: `docs/superpowers/specs/2026-05-03-k6-load-testing-design.md`.

## Prerequisites

- k6 CLI on PATH (`k6 version`). Install: `winget install k6` / `choco install k6` / [k6.io install](https://k6.io/docs/get-started/installation/).
- PowerShell 5.1+ for launchers.
- Backend reachable at `https://blog.sealpi.cn` with at least one published article + tag.

## Quick Start

```powershell
# 1. Build the data pool (one time, or after content changes)
pwsh test/k6/scripts/bootstrap.ps1

# 2. Run the four short profiles back to back
pwsh test/k6/scripts/run-all.ps1

# 3. Run a single profile
pwsh test/k6/scripts/run-all.ps1 -Profiles smoke
pwsh test/k6/scripts/run-all.ps1 -Profiles load,stress
```

Reports land in `test/k6/results/<scenario>-<timestamp>.{json,html}`.

## Environment Variables

| Variable | Default | Used by |
|----------|---------|---------|
| `BASE_URL` | `https://blog.sealpi.cn` | All scenarios |
| `POOL_SIZE` | `30` | bootstrap |
| `MAX_VU` | `200` | stress only |
| `SCENARIO` | (auto) | summary filename |

Override via launcher params (`-BaseUrl`, `-MaxVu`) or set env directly.

## Profile Cheatsheet

| Profile | VU | Duration | Threshold gate |
|---------|----|----------|----------------|
| smoke | 1 | 30s | failures<5%, p95<2000ms |
| load | 0→20→0 | 5 min | failures<1%, p95<500ms, p99<1500ms |
| stress | 0→MAX_VU | up to 10 min (default) | failures<1% **and** p99<1000ms; aborts on breach |
| spike | 5→100→5 | 3 min | failures<10% (record-only) |
| soak | 10 | 30 min | failures<0.5%, p95<600ms |

## Stress: finding the break point

`stress.js` aborts as soon as `http_req_failed > 1%` **or** `p99 > 1000ms` for 30s. The summary prints `BREAK_AT_VU=<N>` (the last fully-loaded stage). If the run completes the full ramp without aborting, the summary suggests doubling `MAX_VU`:

```powershell
pwsh test/k6/scripts/run-all.ps1 -Profiles stress -MaxVu 500
```

## Soak: pre-flight checklist (REQUIRED)

k6 only measures client-side latency. To diagnose JVM memory leaks or host saturation during a 30-min soak you **must** capture server-side metrics on the VM.

1. SSH to the VM (Tencent VM `43.156.71.59`).
2. Find the Java pid:
   ```bash
   pgrep -f BlogStartApplication
   ```
3. Confirm GC logging is enabled (look for `-Xlog:gc*:file=gc.log` in the startup args). If not, add it and restart the backend before running soak.
4. Copy `scripts/vm-monitor.sh` to the VM (one-time; `scp` from local) and run it with the pid + duration in seconds (add a 5-min buffer to account for ramp-up):
   ```bash
   bash vm-monitor.sh <pid> 1800
   ```
   This launches `jstat`, `top`, and `vmstat` in the background and waits.
5. From a separate terminal on your workstation:
   ```powershell
   pwsh test/k6/scripts/run-all.ps1 -OnlySoak
   ```
6. After both finish, pull the VM logs:
   ```powershell
   scp -r vm:logs test/k6/results/soak-monitor-<timestamp>/
   ```

## Layout

```
test/k6/
├── lib/             # config, pool loader, thresholds, weighted dispatcher, summary
├── scenarios/       # one file per profile + bootstrap
├── scripts/         # PowerShell launchers + Linux VM monitor
├── data/pool.json   # generated by bootstrap (gitignored)
└── results/         # JSON + HTML reports (gitignored)
```
```

- [ ] **Step 2: Commit**

```bash
git add test/k6/README.md
git commit -m "test(k6): add README with quickstart, soak preflight, stress tuning"
```

---

## Acceptance Criteria (re-stated from spec §9)

- [ ] `pwsh test/k6/scripts/bootstrap.ps1` produces `data/pool.json` with ≥1 article and ≥1 tag (or ≥0 tags if backend has none — but ≥1 article is hard requirement).
- [ ] `pwsh test/k6/scripts/run-all.ps1 -Profiles smoke` finishes green; `results/smoke-*.json` and `results/smoke-*.html` exist.
- [ ] `pwsh test/k6/scripts/run-all.ps1` runs smoke→load→stress→spike sequentially; each writes its own report pair.
- [ ] `stress.js` summary contains either `BREAK_AT_VU=<N>` (if aborted) or the "MAX_VU stable, double it" hint (if completed).
- [ ] HTML reports open in a browser and display per-group latency percentiles.
- [ ] README covers soak 6-step preflight and stress upper-bound tuning.

---

## Self-Review Notes

Spec coverage check:
- §1 weighted endpoints → Task 3 (`weighted-pick.js`).
- §2 bootstrap + SharedArray pool → Tasks 2, 3.
- §3 five profiles + executor configs → Tasks 5–9.
- §3 stress break-point + abortOnFail + handleSummary BREAK_AT_VU → Task 7.
- §4 per-profile thresholds → Task 3 (`thresholds.js`).
- §5 stdout + JSON + HTML output via handleSummary → Task 4 (`summary.js`).
- §6 vm-monitor.sh + 6-step preflight → Tasks 10, 12.
- §7 directory structure → Task 1 (skeleton) + per-task file creation.
- §8 env vars → Task 1 (`config.js`) + Task 11 (launcher params).
- §9 acceptance → covered by per-task verification + final acceptance section.

Type/name consistency check:
- `pickArticle` / `pickTag` defined in Task 3, consumed in `weighted-pick.js` (same task).
- `runWeighted` exported from Task 3, imported in Tasks 5–9.
- `makeHandleSummary({ scenario })` factory signature consistent across Tasks 4–9.
- `MAX_VU` / `BASE_URL` / `POOL_SIZE` / `SCENARIO` env names consistent across `config.js`, `bootstrap.ps1`, `run-all.ps1`, README.
- Stages-to-stage-count math in `stress.js` (Task 7): MAX_VU=200, step +20 = 10 stages of 1 min each = 10 min total. Matches spec §3.

No placeholders found.
```
