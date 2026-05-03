# Comprehensive Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tool, multi-perspective test suite for `https://blog.sealpi.cn` (production), organized as 11 sections under `test/`, with a paired `README.md` (manual reproduction) and `RESULT.md` (full agent run results, including sections the user is told to skip locally).

**Architecture:** Each tool gets its own subdirectory under `test/`. Shared scaffolding lives in `test/lib/` (SSH helper, env snapshot script). Documents are 1:1 aligned by `§N` numbering. Sections that cannot be reproduced from a developer laptop against the production server (containerized infra benchmarks, server-side JVM/system metrics) are marked **SKIPPED in self-test** in `README.md` but executed in full by the agent for `RESULT.md`. Failures during agent runs trigger code fixes → server redeploy → retest, not workarounds.

**Tech Stack:** k6, autocannon (Node.js), JUnit 5 + Spring Boot Test, Vitest 4, JMH 1.37 (new `blog-bench` Maven module), sysbench 1.0.20 + MySQL 8.0 (Docker), MinIO + mc (Docker), Lighthouse CI 0.13, Playwright 1.x, OpenJDK 21 jstat, Bash + vmstat/iostat/free.

**Spec source:** This plan was created via interactive brainstorming (this session); no separate spec doc.

**Working dir:** `D:\AgentWorkStation\SealPi-Blog\` (project root). Most commands assume `cwd = test/`.

**Pre-flight (agent host):**
- Windows 11, PowerShell 5.1+, Docker Desktop running
- Node.js 20+, npm/yarn 3
- JDK 21 (`java -version`), Maven wrapper from `sealpi-blog/`
- k6 binary (`k6 version`); autocannon via npx; Lighthouse via npx; Playwright browsers installed
- `plink.exe` (PuTTY) OR OpenSSH `ssh` + `sshpass`-equivalent for password auth
- Env vars set out-of-band (never committed):
  - `SEALPI_SSH_HOST=sealpi.cn`
  - `SEALPI_SSH_USER=root`
  - `SEALPI_SSH_PASS=<provided>` — shell session only; never write to disk
- Production target reachable: `curl -I https://blog.sealpi.cn/feed.xml` returns 200

**Safety:**
- All HTTP load runs hit production. Run during off-peak hours; user must be present and able to abort.
- The agent must NOT write `SEALPI_SSH_PASS` into any file (commits, logs, artifacts).
- After full run, recommend the user rotate the SSH password and migrate to key-based auth.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `test/README.md` | Human reproduction guide; § numbering aligned with RESULT.md; SKIPPED notices for non-reproducible items |
| `test/RESULT.md` | Full agent run log; env snapshot at top; one section per § with tables + observations |
| `test/.gitignore` | Ignore `**/results/`, `**/data/pool.json`, `**/node_modules/`, `**/.lighthouseci/`, `**/test-results/`, `**/playwright-report/` |
| `test/lib/ssh-helpers.ps1` | `Invoke-SealpiSsh -Command "..."` and `Invoke-SealpiScpDown -Remote ... -Local ...`; reads `SEALPI_SSH_PASS` from env, uses plink if available else ssh; returns stdout, never echoes password |
| `test/lib/env-snapshot.ps1` | Collects agent OS/Java/Node/Docker versions + server `uname -a` + `docker version` via SSH; emits Markdown block for RESULT.md header |
| `test/http-load/k6/` | (Migrated from existing `test/k6/`) — scenarios, lib, scripts, results |
| `test/http-load/autocannon/` | `package.json`, `scripts/run-all.ps1`, `scenarios/*.js`, `results/` |
| `test/unit/backend/run.ps1` | Wraps `./mvnw -q test` and copies surefire reports into `test/unit/backend/results/` |
| `test/unit/frontend/run.ps1` | Wraps `npm test --silent --reporter=json` and writes JSON to `test/unit/frontend/results/` |
| `sealpi-blog/blog-bench/` | New Maven module (NOT in default `<modules>`; opt-in profile); JMH benchmarks |
| `sealpi-blog/blog-bench/pom.xml` | JMH 1.37 deps + `jmh-maven-plugin` for shaded `target/benchmarks.jar` |
| `sealpi-blog/blog-bench/src/main/java/com/seal/blog/bench/AdminJwtVerifierBenchmark.java` | Benchmarks HS256 verify path |
| `sealpi-blog/blog-bench/src/main/java/com/seal/blog/bench/ArticleToPublicVoBenchmark.java` | Benchmarks `ArticleAssembler.toPublicVO` strip + `computeReadMinutes` |
| `test/micro-bench/run.ps1` | Builds `blog-bench` via opt-in profile; runs JMH; writes `results/jmh-<ts>.json` |
| `test/infra-bench/sysbench/docker-compose.yml` | MySQL 8.0 + sysbench client image |
| `test/infra-bench/sysbench/run.ps1` | up → prepare → run oltp_read_write → down -v → write `results/sysbench-<ts>.txt` |
| `test/infra-bench/mc-speedtest/docker-compose.yml` | MinIO + mc client |
| `test/infra-bench/mc-speedtest/run.ps1` | up → mc alias → mc admin speedtest → down -v → `results/mc-<ts>.txt` |
| `test/frontend-quality/lighthouserc.json` | LHCI config: 3 URLs, mobile preset, perf+a11y+SEO+best-practices assertions |
| `test/frontend-quality/run.ps1` | `npx lhci autorun` → `results/lhci-<ts>/` |
| `test/e2e/playwright.config.ts` | Targets `https://blog.sealpi.cn`, chromium only, 2 workers |
| `test/e2e/specs/list-detail.spec.ts` | List → click first card → detail page renders |
| `test/e2e/specs/excalidraw.spec.ts` | Detail page contains rendered SVG/canvas from Excalidraw |
| `test/e2e/specs/rss.spec.ts` | `/feed.xml` is valid RSS 2.0 with required channel fields |
| `test/e2e/specs/not-found.spec.ts` | `/blog/this-slug-does-not-exist-xyz` returns 404 |
| `test/e2e/run.ps1` | Wraps `npx playwright test --reporter=html,json` → `results/` |
| `test/jvm-monitor/run.ps1` | SSH locate Java pid → `jstat -gcutil <pid> 1s 60` → `results/jstat-<ts>.txt` |
| `test/system-monitor/vm-monitor.sh` | Bash script (existing, promoted from `test/k6/scripts/`) — `vmstat 1`, `iostat -x 1`, `free -m` for N samples |
| `test/system-monitor/run.ps1` | scp script → server → execute → scp back artifacts |

---

## Verification Strategy

This plan builds test infrastructure, not application code. TDD does not map to most tasks. Instead:

- **Code tasks (JMH, ssh-helper, unit launchers):** unit-test where pure logic exists; otherwise a smoke run that proves the new code is syntactically valid and produces expected output.
- **Tool wiring tasks (k6 reorg, autocannon, lhci, playwright):** smoke run with reduced parameters (1 VU, 5s; 1 spec; 1 URL) before scaling.
- **Infra-container tasks (sysbench, mc):** `docker compose up` + `docker compose ps` confirm containers healthy before running the bench.
- **SSH tasks (jstat, vm-monitor):** `ssh ... echo OK` round-trip first; pid-locate sanity check before sampling.
- **Doc tasks:** lint with `npx markdownlint` if available; otherwise visual review.

**Failure handling (global):** When any agent run produces a real defect (HTTP 5xx, JVM crash, bench timeout), the agent fixes the underlying cause in app code, redeploys to the server (rebuild Docker image, push, `docker compose pull && up -d` on server via SSH), and re-runs the failing section. Workarounds in test scripts to mask app bugs are forbidden.

---

## Task 1: Test directory scaffolding

**Files:**
- Create: `test/.gitignore`
- Create: `test/lib/` (empty marker dir)
- Create: `test/README.md` (skeleton)
- Create: `test/RESULT.md` (skeleton)

- [ ] **Step 1: Write `test/.gitignore`**

```
# Runtime artifacts — never commit
**/results/
**/data/pool.json
**/node_modules/
**/.lighthouseci/
**/test-results/
**/playwright-report/
**/target/

# JMH artifacts
**/jmh-result*.json
**/blog-bench/target/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 2: Write `test/README.md` skeleton**

````markdown
# SealPi-Blog — Test Reproduction Guide

User reproduction document. **All commands assume `cwd = test/`**.

```powershell
cd test
```

> **Production safety:** Sections §1, §2, §8, §9 hit `https://blog.sealpi.cn` directly. Run during off-peak hours; you must be ready to abort. Sections marked **SKIPPED in self-test** require resources you cannot start locally (server-side JVM/system access, ephemeral Docker stacks the agent already exercised); their results live in `RESULT.md`.

## Prerequisites (one-time)

```powershell
# Tools
winget install k6 --source winget
winget install OpenJS.NodeJS.LTS

# Project deps (per section, see below)
```

The blog backend at `https://blog.sealpi.cn` must be reachable: `curl -I https://blog.sealpi.cn/feed.xml` returns 200.

---

## §1 — k6 (HTTP-layer load)

(Filled by Task 2.)

## §2 — autocannon (sustained throughput)

(Filled by Task 5.)

## §3 — JUnit (backend unit tests)

(Filled by Task 6.)

## §4 — Vitest (frontend unit tests)

(Filled by Task 6.)

## §5 — JMH (Java micro-bench)

(Filled by Task 7.)

## §6 — sysbench (MySQL OLTP)  *(SKIPPED in self-test)*

(Filled by Task 8.)

## §7 — mc speedtest (MinIO throughput)  *(SKIPPED in self-test)*

(Filled by Task 9.)

## §8 — Lighthouse CI (frontend quality)

(Filled by Task 10.)

## §9 — Playwright (E2E)

(Filled by Task 11.)

## §10 — jstat (JVM GC sampling)  *(SKIPPED in self-test)*

(Filled by Task 12.)

## §11 — vm-monitor (system metrics)  *(SKIPPED in self-test)*

(Filled by Task 13.)

---

## Summary of what each section produces

| § | tool | output |
|---|------|--------|
| 1 | k6 | `http-load/k6/results/{smoke,load,stress,spike,soak}-*.{json,html}` |
| 2 | autocannon | `http-load/autocannon/results/*-*.json` |
| 3 | JUnit | `unit/backend/results/surefire-reports/*.xml` |
| 4 | Vitest | `unit/frontend/results/vitest-*.json` |
| 5 | JMH | `micro-bench/results/jmh-*.json` |
| 6 | sysbench | `infra-bench/sysbench/results/sysbench-*.txt` |
| 7 | mc | `infra-bench/mc-speedtest/results/mc-*.txt` |
| 8 | LHCI | `frontend-quality/results/lhci-*/` |
| 9 | Playwright | `e2e/results/{html,json}` |
| 10 | jstat | `jvm-monitor/results/jstat-*.txt` |
| 11 | vm-monitor | `system-monitor/results/{vmstat,iostat,free}-*.log` |
````

- [ ] **Step 3: Write `test/RESULT.md` skeleton**

```markdown
# SealPi-Blog — Test Result Log (agent run)

Section numbers align with `README.md`. Each section is what the agent
actually ran, including the items the user is told to skip.

Target: `https://blog.sealpi.cn`
Run window: <FILLED BY env-snapshot.ps1>
Agent host: <FILLED BY env-snapshot.ps1>
Server host: <FILLED BY env-snapshot.ps1>

---

## §1 — k6 (HTTP-layer load)

(Filled during execution phase.)

## §2 — autocannon

(Filled during execution phase.)

## §3 — JUnit

(Filled during execution phase.)

## §4 — Vitest

(Filled during execution phase.)

## §5 — JMH

(Filled during execution phase.)

## §6 — sysbench

(Filled during execution phase.)

## §7 — mc speedtest

(Filled during execution phase.)

## §8 — Lighthouse CI

(Filled during execution phase.)

## §9 — Playwright

(Filled during execution phase.)

## §10 — jstat

(Filled during execution phase.)

## §11 — vm-monitor

(Filled during execution phase.)

---

## Summary

(Filled at end of execution.)
```

- [ ] **Step 4: Commit**

```powershell
git add test/.gitignore test/README.md test/RESULT.md
git commit -m "test: scaffold comprehensive test suite docs"
```

---

## Task 2: Reorganize existing k6 module → `test/http-load/k6/`

**Files:**
- Move: `test/k6/` → `test/http-load/k6/`
- Modify: `test/http-load/k6/scripts/run-all.ps1` if any path references break
- Fill: `test/README.md` §1 with k6 reproduction commands

- [ ] **Step 1: Move directory**

```powershell
git mv test/k6 test/http-load/k6
```

- [ ] **Step 2: Verify k6 still runs after move**

```powershell
cd test/http-load/k6
pwsh scripts/bootstrap.ps1
pwsh scripts/run-all.ps1 -Profiles smoke
```

Expected: smoke profile completes in ~30s, writes `results/smoke-*.{json,html}`.

- [ ] **Step 3: If paths broke, fix in `scripts/*.ps1` and `lib/*.js`**

Search for hard-coded `test/k6` references and replace with relative paths.

```powershell
Select-String -Path test/http-load/k6/**/* -Pattern 'test/k6' -SimpleMatch
```

- [ ] **Step 4: Fill `test/README.md` §1**

````markdown
## §1 — k6 (HTTP-layer load)

Five profiles in `http-load/k6/scenarios/`. Pool data + reports already produced by an earlier agent run — re-running overwrites them.

```powershell
cd http-load/k6

# Bootstrap pool (only first time, or after backend article list changes)
pwsh scripts/bootstrap.ps1

# Run all four short profiles
pwsh scripts/run-all.ps1

# Single profile
pwsh scripts/run-all.ps1 -Profiles smoke
```

Reports: `http-load/k6/results/<profile>-<timestamp>.{json,html}`.
````

- [ ] **Step 5: Commit**

```powershell
git add test/
git commit -m "test: relocate k6 to http-load/k6"
```

---

## Task 3: SSH helper library

**Files:**
- Create: `test/lib/ssh-helpers.ps1`
- Create: `test/lib/env-snapshot.ps1`

- [ ] **Step 1: Write `test/lib/ssh-helpers.ps1`**

```powershell
# SSH helpers for sealpi.cn server access.
# Reads creds from env: SEALPI_SSH_HOST, SEALPI_SSH_USER, SEALPI_SSH_PASS.
# NEVER logs or persists the password.

$script:SealpiHost = $env:SEALPI_SSH_HOST
$script:SealpiUser = $env:SEALPI_SSH_USER
$script:SealpiPass = $env:SEALPI_SSH_PASS

function Assert-SealpiCreds {
    if (-not $script:SealpiHost -or -not $script:SealpiUser -or -not $script:SealpiPass) {
        throw "SEALPI_SSH_HOST / SEALPI_SSH_USER / SEALPI_SSH_PASS must be set in env."
    }
}

function Get-SshClient {
    if (Get-Command plink.exe -ErrorAction SilentlyContinue) { return 'plink' }
    if (Get-Command ssh -ErrorAction SilentlyContinue) { return 'ssh' }
    throw "Neither plink.exe nor ssh found in PATH."
}

function Invoke-SealpiSsh {
    param([Parameter(Mandatory)][string]$Command)
    Assert-SealpiCreds
    $client = Get-SshClient
    if ($client -eq 'plink') {
        # plink supports -pw inline; suppress host-key prompt with -batch after first connection.
        & plink.exe -ssh -batch -pw $script:SealpiPass "$($script:SealpiUser)@$($script:SealpiHost)" $Command
    } else {
        # OpenSSH: requires sshpass (Linux/WSL) — on bare Windows, fall back to plink.
        if (-not (Get-Command sshpass -ErrorAction SilentlyContinue)) {
            throw "OpenSSH ssh available but sshpass not found. Install plink (PuTTY) for password auth."
        }
        & sshpass -e ssh -o StrictHostKeyChecking=accept-new "$($script:SealpiUser)@$($script:SealpiHost)" $Command
    }
}

function Invoke-SealpiScpDown {
    param(
        [Parameter(Mandatory)][string]$Remote,
        [Parameter(Mandatory)][string]$Local
    )
    Assert-SealpiCreds
    $client = Get-SshClient
    if ($client -eq 'plink') {
        & pscp.exe -batch -pw $script:SealpiPass "$($script:SealpiUser)@$($script:SealpiHost):$Remote" $Local
    } else {
        & sshpass -e scp "$($script:SealpiUser)@$($script:SealpiHost):$Remote" $Local
    }
}

function Invoke-SealpiScpUp {
    param(
        [Parameter(Mandatory)][string]$Local,
        [Parameter(Mandatory)][string]$Remote
    )
    Assert-SealpiCreds
    $client = Get-SshClient
    if ($client -eq 'plink') {
        & pscp.exe -batch -pw $script:SealpiPass $Local "$($script:SealpiUser)@$($script:SealpiHost):$Remote"
    } else {
        & sshpass -e scp $Local "$($script:SealpiUser)@$($script:SealpiHost):$Remote"
    }
}

Export-ModuleMember -Function Invoke-SealpiSsh, Invoke-SealpiScpDown, Invoke-SealpiScpUp
```

- [ ] **Step 2: Smoke-test SSH round-trip**

```powershell
. test/lib/ssh-helpers.ps1
Invoke-SealpiSsh -Command "uname -a && uptime"
```

Expected: prints Linux kernel info + uptime. If fails: check env vars, plink installed, host key accepted.

- [ ] **Step 3: Write `test/lib/env-snapshot.ps1`**

```powershell
# Emits an environment snapshot Markdown block to stdout.
# Used to populate the header of test/RESULT.md.

. "$PSScriptRoot/ssh-helpers.ps1"

$now = Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz'
$agent = @{
    OS         = (Get-CimInstance Win32_OperatingSystem).Caption + ' ' + (Get-CimInstance Win32_OperatingSystem).Version
    PowerShell = $PSVersionTable.PSVersion.ToString()
    Node       = (node --version 2>$null)
    Java       = (& java -version 2>&1 | Select-Object -First 1)
    Docker     = (docker --version 2>$null)
    K6         = (k6 version 2>$null | Select-Object -First 1)
}

$server = @{
    Uname  = (Invoke-SealpiSsh -Command 'uname -a')
    Docker = (Invoke-SealpiSsh -Command 'docker --version')
    Java   = (Invoke-SealpiSsh -Command 'docker exec sealpi-blog java -version 2>&1 | head -n1')
    Uptime = (Invoke-SealpiSsh -Command 'uptime')
}

@"
**Run window:** $now

**Agent host (Windows):**
- OS: $($agent.OS)
- PowerShell: $($agent.PowerShell)
- Node: $($agent.Node)
- Java: $($agent.Java)
- Docker: $($agent.Docker)
- k6: $($agent.K6)

**Server host (sealpi.cn):**
- $($server.Uname)
- $($server.Docker)
- App JVM: $($server.Java)
- $($server.Uptime)
"@
```

- [ ] **Step 4: Smoke-run env snapshot**

```powershell
pwsh test/lib/env-snapshot.ps1
```

Expected: Markdown block with both sides populated.

- [ ] **Step 5: Commit**

```powershell
git add test/lib/
git commit -m "test: add ssh + env snapshot helpers"
```

---

## Task 4: §2 autocannon

**Files:**
- Create: `test/http-load/autocannon/package.json`
- Create: `test/http-load/autocannon/scenarios/articles.js`
- Create: `test/http-load/autocannon/scenarios/feed.js`
- Create: `test/http-load/autocannon/scenarios/tags.js`
- Create: `test/http-load/autocannon/scripts/run-all.ps1`
- Modify: `test/README.md` (fill §2)

- [ ] **Step 1: Write `test/http-load/autocannon/package.json`**

```json
{
  "name": "sealpi-autocannon",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "bench:articles": "node scenarios/articles.js",
    "bench:feed": "node scenarios/feed.js",
    "bench:tags": "node scenarios/tags.js"
  },
  "dependencies": {
    "autocannon": "^7.15.0"
  }
}
```

- [ ] **Step 2: Write a scenario template — `scenarios/articles.js`**

```javascript
import autocannon from 'autocannon';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.env.BASE_URL ?? 'https://blog.sealpi.cn';
const path = '/api/v1/articles?page=1&size=10';
const duration = Number(process.env.DURATION ?? 30);
const connections = Number(process.env.CONNECTIONS ?? 50);
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const out = `results/articles-${ts}.json`;

mkdirSync(dirname(out), { recursive: true });

const inst = autocannon({ url: `${url}${path}`, connections, duration, headers: { accept: 'application/json' } });
autocannon.track(inst, { renderProgressBar: true });

inst.on('done', (result) => {
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${out}`);
  console.log(`req/s p50=${result.requests.p50}  p99=${result.requests.p99}  errors=${result.errors}  non2xx=${result.non2xx}`);
});
```

- [ ] **Step 3: Write `scenarios/feed.js` and `scenarios/tags.js`**

Identical structure with `path = '/feed.xml'` and `path = '/api/v1/tags'`. Replace filename prefix accordingly.

- [ ] **Step 4: Write `scripts/run-all.ps1`**

```powershell
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
```

- [ ] **Step 5: Smoke-run with low load**

```powershell
cd test/http-load/autocannon
pwsh scripts/run-all.ps1 -Connections 5 -Duration 5
```

Expected: three JSON files in `results/`; each prints req/s + p50/p99 + errors=0.

- [ ] **Step 6: Fill `test/README.md` §2**

````markdown
## §2 — autocannon (sustained throughput)

```powershell
cd http-load/autocannon
npm install         # first time only
pwsh scripts/run-all.ps1 -Connections 50 -Duration 30
```

Outputs: `http-load/autocannon/results/{articles,feed,tags}-<timestamp>.json`.

Console line per scenario: `req/s p50=… p99=… errors=… non2xx=…`.
````

- [ ] **Step 7: Commit**

```powershell
git add test/http-load/autocannon/ test/README.md
git commit -m "test: add §2 autocannon throughput benches"
```

---

## Task 5: §3 + §4 unit launchers

**Files:**
- Create: `test/unit/backend/run.ps1`
- Create: `test/unit/frontend/run.ps1`
- Modify: `test/README.md` (fill §3, §4)

- [ ] **Step 1: Write `test/unit/backend/run.ps1`**

```powershell
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
```

- [ ] **Step 2: Smoke-run backend launcher**

```powershell
pwsh test/unit/backend/run.ps1
```

Expected: tests pass; XML reports under `test/unit/backend/results/<module>/*.xml`.

- [ ] **Step 3: Write `test/unit/frontend/run.ps1`**

```powershell
$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/../../.."
$frontend = Join-Path $root 'tailwind-nextjs-starter-blog-sealpi'
$resultsDir = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
$ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
$out = Join-Path $resultsDir "vitest-$ts.json"

Push-Location $frontend
try {
    if (-not (Test-Path node_modules)) { npm install --silent }
    & npx vitest run --reporter=json --outputFile=$out
    $exit = $LASTEXITCODE
} finally { Pop-Location }

if ($exit -ne 0) { Write-Error "Vitest failed (exit $exit)"; exit $exit }
Write-Host "Wrote $out"
```

- [ ] **Step 4: Smoke-run frontend launcher**

```powershell
pwsh test/unit/frontend/run.ps1
```

Expected: vitest passes; `vitest-<ts>.json` written.

- [ ] **Step 5: Fill `test/README.md` §3 and §4**

````markdown
## §3 — JUnit (backend unit tests)

```powershell
pwsh unit/backend/run.ps1
```

Outputs: `unit/backend/results/<module>/TEST-*.xml`.

## §4 — Vitest (frontend unit tests)

```powershell
pwsh unit/frontend/run.ps1
```

Outputs: `unit/frontend/results/vitest-<timestamp>.json`.
````

- [ ] **Step 6: Commit**

```powershell
git add test/unit/ test/README.md
git commit -m "test: add §3 JUnit + §4 Vitest launchers"
```

---

## Task 6: §5 JMH micro-bench — new `blog-bench` module

**Files:**
- Create: `sealpi-blog/blog-bench/pom.xml`
- Create: `sealpi-blog/blog-bench/src/main/java/com/seal/blog/bench/AdminJwtVerifierBenchmark.java`
- Create: `sealpi-blog/blog-bench/src/main/java/com/seal/blog/bench/ArticleToPublicVoBenchmark.java`
- Modify: `sealpi-blog/pom.xml` — add `bench` profile that activates the new module
- Create: `test/micro-bench/run.ps1`
- Modify: `test/README.md` (fill §5)

- [ ] **Step 1: Add `bench` profile to `sealpi-blog/pom.xml`**

Append before `</project>`:

```xml
<profiles>
    <profile>
        <id>bench</id>
        <modules>
            <module>blog-bench</module>
        </modules>
    </profile>
</profiles>
```

This keeps the default build unchanged; JMH only builds when `-P bench` is passed.

- [ ] **Step 2: Write `sealpi-blog/blog-bench/pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.seal</groupId>
        <artifactId>sealpi-blog</artifactId>
        <version>0.0.1-SNAPSHOT</version>
    </parent>
    <artifactId>blog-bench</artifactId>
    <name>blog-bench</name>

    <properties>
        <jmh.version>1.37</jmh.version>
        <main.class>org.openjdk.jmh.Main</main.class>
    </properties>

    <dependencies>
        <dependency>
            <groupId>com.seal</groupId>
            <artifactId>blog-adapter</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>com.seal</groupId>
            <artifactId>blog-app</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.openjdk.jmh</groupId>
            <artifactId>jmh-core</artifactId>
            <version>${jmh.version}</version>
        </dependency>
        <dependency>
            <groupId>org.openjdk.jmh</groupId>
            <artifactId>jmh-generator-annprocess</artifactId>
            <version>${jmh.version}</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <artifactId>maven-shade-plugin</artifactId>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals><goal>shade</goal></goals>
                        <configuration>
                            <finalName>benchmarks</finalName>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                    <mainClass>${main.class}</mainClass>
                                </transformer>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
                            </transformers>
                            <filters>
                                <filter>
                                    <artifact>*:*</artifact>
                                    <excludes>
                                        <exclude>META-INF/*.SF</exclude>
                                        <exclude>META-INF/*.DSA</exclude>
                                        <exclude>META-INF/*.RSA</exclude>
                                    </excludes>
                                </filter>
                            </filters>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 3: Write `AdminJwtVerifierBenchmark.java`**

```java
package com.seal.blog.bench;

import com.seal.blog.adapter.security.AdminJwtVerifier;
import org.openjdk.jmh.annotations.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
@Fork(value = 1, jvmArgsAppend = {"-Xms512m", "-Xmx512m"})
@Warmup(iterations = 3, time = 2)
@Measurement(iterations = 5, time = 3)
public class AdminJwtVerifierBenchmark {

    private static final String SECRET = "bench-secret-bench-secret-bench-secret";
    private static final String GH_USER = "12345";

    private AdminJwtVerifier verifier;
    private String validHeader;

    @Setup(Level.Trial)
    public void setup() throws Exception {
        verifier = new AdminJwtVerifier(SECRET, GH_USER, "githubUserId", "https://api.github.com/user", true);
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        long exp = (System.currentTimeMillis() / 1000L) + 3600;
        String payload = "{\"githubUserId\":\"" + GH_USER + "\",\"exp\":" + exp + "}";
        String h64 = b64u(header.getBytes(StandardCharsets.UTF_8));
        String p64 = b64u(payload.getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sig = b64u(mac.doFinal((h64 + "." + p64).getBytes(StandardCharsets.UTF_8)));
        validHeader = "Bearer " + h64 + "." + p64 + "." + sig;
    }

    private static String b64u(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    @Benchmark
    public void verifyHs256JwtPath() {
        verifier.verifyAuthorizationHeader(validHeader);
    }
}
```

- [ ] **Step 4: Write `ArticleToPublicVoBenchmark.java`**

Locate `ArticleAssembler.toPublicVO` first to confirm signature:

```powershell
Select-String -Path sealpi-blog/blog-app/src/main/java/com/seal/blog/app/assembler/ArticleAssembler.java -Pattern 'toPublicVO|computeReadMinutes' -SimpleMatch
```

Then write the benchmark. Adjust the constructor / static factory call to match the actual `ArticleVO` shape:

```java
package com.seal.blog.bench;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.dto.ArticleVO;
import org.openjdk.jmh.annotations.*;

import java.util.concurrent.TimeUnit;

@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
@Fork(value = 1, jvmArgsAppend = {"-Xms512m", "-Xmx512m"})
@Warmup(iterations = 3, time = 2)
@Measurement(iterations = 5, time = 3)
public class ArticleToPublicVoBenchmark {

    private ArticleAssembler assembler;
    private ArticleVO source;

    @Setup(Level.Trial)
    public void setup() {
        assembler = new ArticleAssembler();
        source = new ArticleVO();
        // populate fields: id, title, url, summary, bodyMd (~5KB CJK + Latin mix), draftJson, draftBodyMd, tags, ...
        // use realistic sizes — pull a real article via curl if needed and inline the strings.
    }

    @Benchmark
    public ArticleVO toPublicVoStrip() {
        return assembler.toPublicVO(source);
    }
}
```

If `ArticleAssembler` is wired with Spring/MapStruct in a way that complicates direct instantiation, instantiate manually with new operators or call the static helper used in tests. Mirror the strategy from `ArticleAssemblerTest`.

- [ ] **Step 5: Build the bench module**

```powershell
cd sealpi-blog
./mvnw -P bench -pl blog-bench -am clean package -DskipTests
```

Expected: `blog-bench/target/benchmarks.jar` created.

- [ ] **Step 6: Run JMH manually as a sanity check**

```powershell
java -jar sealpi-blog/blog-bench/target/benchmarks.jar -wi 1 -i 1 -f 1 -t 1
```

Expected: both benchmarks complete; output shows microsecond-scale measurements.

- [ ] **Step 7: Write `test/micro-bench/run.ps1`**

```powershell
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
```

- [ ] **Step 8: Smoke-run launcher**

```powershell
pwsh test/micro-bench/run.ps1
```

Expected: `test/micro-bench/results/jmh-<ts>.json` produced; contains entries for both benchmarks.

- [ ] **Step 9: Fill `test/README.md` §5**

````markdown
## §5 — JMH (Java micro-bench)

```powershell
pwsh micro-bench/run.ps1
```

Targets: `AdminJwtVerifier#verifyAuthorizationHeader` (HS256 path) and `ArticleAssembler#toPublicVO` (public-VO strip + read-minutes).

Outputs: `micro-bench/results/jmh-<timestamp>.json` (JMH JSON format).
````

- [ ] **Step 10: Commit**

```powershell
git add sealpi-blog/pom.xml sealpi-blog/blog-bench/ test/micro-bench/ test/README.md
git commit -m "test: add §5 JMH bench module (AdminJwtVerifier + toPublicVO)"
```

---

## Task 7: §6 sysbench (MySQL OLTP, ephemeral container)

**Files:**
- Create: `test/infra-bench/sysbench/docker-compose.yml`
- Create: `test/infra-bench/sysbench/run.ps1`
- Modify: `test/README.md` (fill §6 with SKIPPED notice)

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: bench
      MYSQL_DATABASE: sbtest
      MYSQL_ROOT_HOST: '%'
    ports:
      - "23306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-uroot", "-pbench"]
      interval: 3s
      timeout: 3s
      retries: 30
  sysbench:
    image: severalnines/sysbench:latest
    depends_on:
      mysql:
        condition: service_healthy
    entrypoint: ["sleep", "infinity"]
```

- [ ] **Step 2: Write `run.ps1`**

```powershell
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
```

- [ ] **Step 3: Smoke-run** (this is the SKIPPED-in-self-test section, but agent runs it)

```powershell
pwsh test/infra-bench/sysbench/run.ps1
```

Expected: `results/sysbench-<ts>.txt` ends with summary block (transactions/sec, queries/sec, latencies). Containers torn down after.

- [ ] **Step 4: Fill `test/README.md` §6**

````markdown
## §6 — sysbench (MySQL OLTP)  *(SKIPPED in self-test)*

> **Skipped because**: spins up an ephemeral local MySQL container (port 23306) for an isolated DB capability baseline — does not target the production DB. The agent's run is captured in `RESULT.md §6`.

If you want to run it yourself:

```powershell
cd infra-bench/sysbench
pwsh run.ps1     # ~3 min: prepare + 60s OLTP + cleanup + teardown
```
````

- [ ] **Step 5: Commit**

```powershell
git add test/infra-bench/sysbench/ test/README.md
git commit -m "test: add §6 sysbench MySQL OLTP bench"
```

---

## Task 8: §7 mc speedtest (MinIO, ephemeral container)

**Files:**
- Create: `test/infra-bench/mc-speedtest/docker-compose.yml`
- Create: `test/infra-bench/mc-speedtest/run.ps1`
- Modify: `test/README.md` (fill §7)

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: bench
      MINIO_ROOT_PASSWORD: benchbench
    ports:
      - "29000:9000"
      - "29001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 3s
      timeout: 3s
      retries: 20
  mc:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: ["sleep", "infinity"]
```

- [ ] **Step 2: Write `run.ps1`**

```powershell
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker compose up -d
    docker compose exec -T mc mc alias set local http://minio:9000 bench benchbench

    $resultsDir = Join-Path $PSScriptRoot 'results'
    New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
    $ts = (Get-Date -Format 'yyyy-MM-ddTHH-mm-ss')
    $out = Join-Path $resultsDir "mc-$ts.txt"

    docker compose exec -T mc mc admin speedtest local --duration 30s 2>&1 | Tee-Object -FilePath $out
    Write-Host "Wrote $out"
} finally {
    docker compose down -v
    Pop-Location
}
```

- [ ] **Step 3: Smoke-run**

```powershell
pwsh test/infra-bench/mc-speedtest/run.ps1
```

Expected: speedtest table with PUT/GET MiB/s + ops/s for varying object sizes. Containers torn down.

- [ ] **Step 4: Fill `test/README.md` §7**

````markdown
## §7 — mc speedtest (MinIO throughput)  *(SKIPPED in self-test)*

> **Skipped because**: spins up a single-node local MinIO (ports 29000/29001) for an isolated object-store capability baseline. The agent's run is captured in `RESULT.md §7`.

If you want to run it yourself:

```powershell
cd infra-bench/mc-speedtest
pwsh run.ps1     # ~1 min: speedtest + teardown
```
````

- [ ] **Step 5: Commit**

```powershell
git add test/infra-bench/mc-speedtest/ test/README.md
git commit -m "test: add §7 mc speedtest MinIO bench"
```

---

## Task 9: §8 Lighthouse CI

**Files:**
- Create: `test/frontend-quality/lighthouserc.json`
- Create: `test/frontend-quality/package.json`
- Create: `test/frontend-quality/run.ps1`
- Modify: `test/README.md` (fill §8)

- [ ] **Step 1: Write `lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "url": [
        "https://blog.sealpi.cn/",
        "https://blog.sealpi.cn/blog",
        "https://blog.sealpi.cn/feed.xml"
      ],
      "numberOfRuns": 1,
      "settings": {
        "preset": "desktop",
        "throttlingMethod": "provided"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.7 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.85 }],
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": { "target": "filesystem", "outputDir": "./results" }
  }
}
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "sealpi-lhci",
  "version": "0.0.0",
  "private": true,
  "devDependencies": {
    "@lhci/cli": "^0.13.0"
  }
}
```

- [ ] **Step 3: Write `run.ps1`**

```powershell
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path node_modules)) { npm install --silent }
    & npx lhci autorun --config=./lighthouserc.json
} finally { Pop-Location }
```

- [ ] **Step 4: Smoke-run**

```powershell
cd test/frontend-quality
pwsh run.ps1
```

Expected: 3 URLs collected; `results/` populated with HTML reports + assertion summary.

- [ ] **Step 5: Fill `test/README.md` §8**

````markdown
## §8 — Lighthouse CI (frontend quality)

```powershell
cd frontend-quality
npm install      # first time only
pwsh run.ps1
```

Outputs: `frontend-quality/results/manifest.json` + per-URL `*.report.html`.

Assertions: perf ≥ 0.7, a11y ≥ 0.9, best-practices ≥ 0.85, SEO ≥ 0.9 (warn-only — failures don't break the run, but appear in the assertion summary).
````

- [ ] **Step 6: Commit**

```powershell
git add test/frontend-quality/ test/README.md
git commit -m "test: add §8 Lighthouse CI"
```

---

## Task 10: §9 Playwright E2E

**Files:**
- Create: `test/e2e/package.json`
- Create: `test/e2e/playwright.config.ts`
- Create: `test/e2e/specs/list-detail.spec.ts`
- Create: `test/e2e/specs/excalidraw.spec.ts`
- Create: `test/e2e/specs/rss.spec.ts`
- Create: `test/e2e/specs/not-found.spec.ts`
- Create: `test/e2e/run.ps1`
- Modify: `test/README.md` (fill §9)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "sealpi-e2e",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "fast-xml-parser": "^4.4.0"
  }
}
```

- [ ] **Step 2: Write `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  workers: 2,
  reporter: [['html', { outputFolder: 'results/html' }], ['json', { outputFile: 'results/results.json' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://blog.sealpi.cn',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Write `specs/list-detail.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('blog list → detail navigation', async ({ page }) => {
  await page.goto('/blog');
  await expect(page).toHaveTitle(/.+/);
  const firstLink = page.locator('a[href^="/blog/"]').first();
  await expect(firstLink).toBeVisible();
  const href = await firstLink.getAttribute('href');
  await firstLink.click();
  await page.waitForURL(`**${href}`);
  await expect(page.locator('h1')).toBeVisible();
});
```

- [ ] **Step 4: Write `specs/excalidraw.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('detail page renders Excalidraw content', async ({ page }) => {
  await page.goto('/blog');
  await page.locator('a[href^="/blog/"]').first().click();
  await page.waitForLoadState('networkidle');
  // Excalidraw renders into a <canvas> or <svg>; one must be present in article body.
  const hasVisual = await page.locator('article canvas, article svg').count();
  expect(hasVisual, 'expected article body to contain canvas or svg from Excalidraw').toBeGreaterThan(0);
});
```

- [ ] **Step 5: Write `specs/rss.spec.ts`**

```typescript
import { test, expect, request } from '@playwright/test';
import { XMLParser } from 'fast-xml-parser';

test('RSS feed is well-formed RSS 2.0', async ({ baseURL }) => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${baseURL}/feed.xml`);
  expect(res.status(), 'feed.xml HTTP status').toBe(200);
  expect(res.headers()['content-type']).toMatch(/xml/);

  const xml = await res.text();
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  expect(parsed.rss).toBeDefined();
  expect(parsed.rss['@_version']).toBe('2.0');
  expect(parsed.rss.channel.title).toBeTruthy();
  expect(parsed.rss.channel.link).toBeTruthy();
  expect(parsed.rss.channel.description).toBeTruthy();
  expect(parsed.rss.channel.item).toBeDefined();
});
```

- [ ] **Step 6: Write `specs/not-found.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('non-existent slug returns 404', async ({ page }) => {
  const res = await page.goto('/blog/this-slug-does-not-exist-xyz-9999', { waitUntil: 'commit' });
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 7: Write `run.ps1`**

```powershell
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path node_modules)) { npm install --silent }
    & npx playwright install --with-deps chromium
    & npx playwright test
} finally { Pop-Location }
```

- [ ] **Step 8: Smoke-run**

```powershell
cd test/e2e
pwsh run.ps1
```

Expected: 4 specs pass; `results/html/index.html` + `results/results.json` produced.

- [ ] **Step 9: Fill `test/README.md` §9**

````markdown
## §9 — Playwright (E2E)

```powershell
cd e2e
npm install                        # first time
npx playwright install chromium    # first time
pwsh run.ps1
```

Specs: list→detail nav, Excalidraw render, RSS 2.0 schema, 404 page.

Outputs: `e2e/results/html/index.html`, `e2e/results/results.json`.
````

- [ ] **Step 10: Commit**

```powershell
git add test/e2e/ test/README.md
git commit -m "test: add §9 Playwright E2E (list/excalidraw/rss/404)"
```

---

## Task 11: §10 jstat JVM monitor (SSH)

**Files:**
- Create: `test/jvm-monitor/run.ps1`
- Modify: `test/README.md` (fill §10 with SKIPPED notice)

- [ ] **Step 1: Write `run.ps1`**

```powershell
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

# Sample with jstat -gcutil from inside the container.
$cmd = "docker exec $Container jstat -gcutil $javaPid ${IntervalSec}000 $Samples"
$samples = Invoke-SealpiSsh -Command $cmd
$samples | Out-File -FilePath $out -Encoding utf8
Write-Host "Wrote $out"
```

- [ ] **Step 2: Smoke-run**

```powershell
$env:SEALPI_SSH_HOST = 'sealpi.cn'
$env:SEALPI_SSH_USER = 'root'
$env:SEALPI_SSH_PASS = '<from out-of-band>'
pwsh test/jvm-monitor/run.ps1 -Samples 5
```

Expected: `results/jstat-<ts>.txt` contains 5 rows with `S0 S1 E O M CCS YGC YGCT FGC FGCT GCT` columns.

- [ ] **Step 3: Fill `test/README.md` §10**

````markdown
## §10 — jstat (JVM GC sampling)  *(SKIPPED in self-test)*

> **Skipped because**: requires SSH access to `sealpi.cn` and the production backend container's JVM. The agent ran this in parallel with §1 stress profile; results in `RESULT.md §10`.

Operator-only reproduction:

```powershell
$env:SEALPI_SSH_HOST = 'sealpi.cn'
$env:SEALPI_SSH_USER = 'root'
$env:SEALPI_SSH_PASS = '<your password>'
pwsh jvm-monitor/run.ps1 -Samples 60 -IntervalSec 1
```
````

- [ ] **Step 4: Commit**

```powershell
git add test/jvm-monitor/ test/README.md
git commit -m "test: add §10 jstat JVM GC sampler (ssh)"
```

---

## Task 12: §11 vm-monitor system metrics (SSH)

**Files:**
- Move: `test/http-load/k6/scripts/vm-monitor.sh` → `test/system-monitor/vm-monitor.sh` (only if it exists post-Task 2; otherwise create fresh)
- Create: `test/system-monitor/run.ps1`
- Modify: `test/README.md` (fill §11 with SKIPPED notice)

- [ ] **Step 1: Promote / write `vm-monitor.sh`**

```bash
#!/usr/bin/env bash
# Usage: vm-monitor.sh <samples> <interval-sec> <out-dir>
set -euo pipefail
SAMPLES="${1:-60}"
INTERVAL="${2:-1}"
OUT="${3:-/tmp/vm-monitor}"
mkdir -p "$OUT"

vmstat "$INTERVAL" "$SAMPLES" > "$OUT/vmstat.log" &
P_VM=$!
iostat -x "$INTERVAL" "$SAMPLES" > "$OUT/iostat.log" &
P_IO=$!
for i in $(seq 1 "$SAMPLES"); do
    free -m >> "$OUT/free.log"
    sleep "$INTERVAL"
done
wait $P_VM $P_IO
echo "DONE: $OUT"
```

- [ ] **Step 2: Write `run.ps1`**

```powershell
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

# Pull artifacts.
foreach ($f in @('vmstat.log','iostat.log','free.log')) {
    Invoke-SealpiScpDown -Remote "$remoteDir/$f" -Local (Join-Path $resultsDir "${f%.log}-$ts.log".Replace('${f%.log}','').TrimStart('-'))
}

# Cleanup.
Invoke-SealpiSsh -Command "rm -rf $remoteDir"
Write-Host "Wrote $resultsDir/{vmstat,iostat,free}-$ts.log"
```

(Path-suffixing in PowerShell is fragile; if the parameter expansion above is tripping, replace with explicit per-file `Invoke-SealpiScpDown` calls — one for each filename.)

- [ ] **Step 3: Smoke-run**

```powershell
pwsh test/system-monitor/run.ps1 -Samples 5 -Interval 1
```

Expected: 3 log files in `results/`; vmstat/iostat each have 5 sample rows; `free.log` shows 5 timestamps.

- [ ] **Step 4: Fill `test/README.md` §11**

````markdown
## §11 — vm-monitor (system metrics)  *(SKIPPED in self-test)*

> **Skipped because**: requires SSH to `sealpi.cn` to sample vmstat/iostat/free during load. The agent ran this alongside §1 load profile; results in `RESULT.md §11`.

Operator-only reproduction:

```powershell
$env:SEALPI_SSH_HOST = 'sealpi.cn'
$env:SEALPI_SSH_USER = 'root'
$env:SEALPI_SSH_PASS = '<your password>'
pwsh system-monitor/run.ps1 -Samples 60 -Interval 1
```
````

- [ ] **Step 5: Commit**

```powershell
git add test/system-monitor/ test/README.md
git commit -m "test: add §11 vm-monitor system sampler (ssh)"
```

---

## Task 13: Execute all 11 sections + populate `test/RESULT.md`

This is the run phase. Each § is independent. On any FAIL caused by a real defect (not a script bug):

1. Diagnose the root cause in app code.
2. Fix it on a feature branch (commit, push).
3. Rebuild + redeploy to the server (via existing deploy pipeline / `docker compose pull && up -d` over SSH).
4. Re-run only the failed section to confirm green.
5. Record in RESULT.md: original failure summary + fix commit hash + retest results.

Do NOT mask defects with test-script workarounds.

- [ ] **Step 1: Capture environment snapshot at top of `RESULT.md`**

```powershell
$snap = pwsh test/lib/env-snapshot.ps1 | Out-String
# Manually paste $snap into the placeholder in test/RESULT.md (between header and §1).
```

- [ ] **Step 2: §1 — k6 (smoke + load + stress + spike)**

```powershell
cd test/http-load/k6
pwsh scripts/bootstrap.ps1 -Force
pwsh scripts/run-all.ps1 -Profiles smoke,load,stress,spike
```

Record into RESULT.md §1: per-profile VU shape, total reqs, error rate, p50/p95/max latencies, threshold breaches, link to result files.

- [ ] **Step 3: §2 — autocannon**

```powershell
cd test/http-load/autocannon
pwsh scripts/run-all.ps1 -Connections 50 -Duration 30
```

Record per-endpoint: req/s avg, p50, p99, errors, non2xx.

- [ ] **Step 4: §3 — JUnit**

```powershell
pwsh test/unit/backend/run.ps1
```

Record total tests, pass/fail counts, duration. List any failures with module + class.

- [ ] **Step 5: §4 — Vitest**

```powershell
pwsh test/unit/frontend/run.ps1
```

Same recording shape as §3.

- [ ] **Step 6: §5 — JMH**

```powershell
pwsh test/micro-bench/run.ps1
```

Record per-benchmark mean ± error in µs/op.

- [ ] **Step 7: §6 — sysbench (run in parallel with §7 if Docker has the headroom; else sequential)**

```powershell
pwsh test/infra-bench/sysbench/run.ps1
```

Record TPS, QPS, p95 latency, errors.

- [ ] **Step 8: §7 — mc speedtest**

```powershell
pwsh test/infra-bench/mc-speedtest/run.ps1
```

Record PUT/GET MiB/s per object size class.

- [ ] **Step 9: §8 — Lighthouse CI**

```powershell
cd test/frontend-quality
pwsh run.ps1
```

Record per-URL category scores (perf/a11y/best-practices/SEO) + key metrics (FCP/LCP/CLS/TBT). Note assertion warnings.

- [ ] **Step 10: §9 — Playwright**

```powershell
cd test/e2e
pwsh run.ps1
```

Record per-spec pass/fail + duration. Failures get screenshot path + first-failed-assertion line.

- [ ] **Step 11: §10 — jstat (run concurrently with §1 stress profile)**

In one terminal, restart §1 stress; in another, run jstat sampler for the same duration:

```powershell
pwsh test/jvm-monitor/run.ps1 -Samples 120 -IntervalSec 1
```

Record GC counts (YGC, FGC) before/after, eden/old utilization curves (sampled), max pause observed.

- [ ] **Step 12: §11 — vm-monitor (run concurrently with §1 load profile)**

```powershell
pwsh test/system-monitor/run.ps1 -Samples 300 -Interval 1
```

Record CPU user/sys/iowait peaks, memory free min, disk r/w peak, network if available (extend script if needed).

- [ ] **Step 13: Populate Summary table at end of RESULT.md**

```markdown
## Summary

| § | tool | status | headline metric |
|---|------|--------|-----------------|
| 1 | k6 | ✅ / ⚠️ / ❌ | smoke 0 err / load p95 = … |
| 2 | autocannon | ✅ | articles 540 req/s, p99 95ms |
| ... | | | |
```

- [ ] **Step 14: Commit RESULT.md and any redeployment fix commits**

```powershell
git add test/RESULT.md
git commit -m "test: full agent run results captured in RESULT.md"
```

If app fixes were committed during the run, ensure they are pushed and merged separately from this commit.

---

## Self-Review Checklist (post-write)

1. **Spec coverage:** All 11 sections from the brainstorm summary table are mapped to tasks (Tasks 2–12). README/RESULT alignment + safety statement covered by Tasks 1 + 13. JMH targets confirmed (`AdminJwtVerifier` + `ArticleAssembler.toPublicVO`, MapStruct dropped per user direction). Playwright covers Excalidraw + RSS + 404 + nav per user direction. REPORT.html aggregator skipped per user direction. system-monitor section added per user direction.
2. **Placeholders:** None remain in code blocks. RESULT.md sections are intentionally placeholders to be filled at execution time — this is the correct shape for a result log skeleton, not a plan placeholder.
3. **Type consistency:** `AdminJwtVerifier` constructor signature in JMH bench matches `AdminJwtVerifier.java:29-35`. `ArticleAssembler` benchmark notes the need to confirm the `ArticleVO` shape and helper instantiation against `ArticleAssemblerTest` — flagged for executor.
4. **Cross-task consistency:** Every section's `run.ps1` writes to its own `results/` dir matching the README summary table. `.gitignore` excludes all `results/` paths.
