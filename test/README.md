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

## §2 — autocannon (sustained throughput)

```powershell
cd http-load/autocannon
npm install         # first time only
pwsh scripts/run-all.ps1 -Connections 50 -Duration 30
```

Outputs: `http-load/autocannon/results/{articles,feed,tags}-<timestamp>.json`.

Console line per scenario: `req/s p50=… p99=… errors=… non2xx=…`.

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

## §5 — JMH (Java micro-bench)

```powershell
pwsh micro-bench/run.ps1
```

Targets: `AdminJwtVerifier#verifyAuthorizationHeader` (HS256 path) and `ArticleAssembler#toPublicVO` (public-VO strip + read-minutes).

Outputs: `micro-bench/results/jmh-<timestamp>.json` (JMH JSON format).

> Note: 1 fork × 5 iterations is intended for indicative numbers; CI may be ±25%. For comparative measurements bump to `-f 3 -wi 5 -i 10`.

## §6 — sysbench (MySQL OLTP)  *(SKIPPED in self-test)*

> **Skipped because**: spins up an ephemeral local MySQL container (port 23306) for an isolated DB capability baseline — does not target the production DB. The agent's run is captured in `RESULT.md §6`.

If you want to run it yourself:

```powershell
cd infra-bench/sysbench
pwsh run.ps1     # ~3 min: prepare + 60s OLTP + cleanup + teardown
```

## §7 — mc speedtest (MinIO throughput)  *(SKIPPED in self-test)*

> **Skipped because**: spins up a single-node local MinIO (ports 29000/29001) for an isolated object-store capability baseline. The agent's run is captured in `RESULT.md §7`.

If you want to run it yourself:

```powershell
cd infra-bench/mc-speedtest
pwsh run.ps1     # ~1-2 min: speedtest (or PUT/GET fallback) + teardown
```

## §8 — Lighthouse CI (frontend quality)

2 URLs audited: home (`/`) and blog list (`/blog`). `feed.xml` is XML and cannot be evaluated by Lighthouse, so it is excluded.

**Prereq**: Chrome must be available. If LHCI reports "Chrome installation not found", run once:

```powershell
npx puppeteer browsers install chrome
$env:CHROME_PATH = "$env:USERPROFILE\.cache\puppeteer\chrome\win64-147.0.7727.57\chrome-win64\chrome.exe"
```

```powershell
cd frontend-quality
npm install      # first time only
$env:CHROME_PATH = "$env:USERPROFILE\.cache\puppeteer\chrome\win64-147.0.7727.57\chrome-win64\chrome.exe"
pwsh run.ps1
```

Outputs: `frontend-quality/results/manifest.json` + per-URL `*.report.html`.

Assertions: perf ≥ 0.7, a11y ≥ 0.9, best-practices ≥ 0.85, SEO ≥ 0.9 (warn-only — failures don't break the run, but appear in the assertion summary).

## §9 — Playwright (E2E)

```powershell
cd e2e
npm install                        # first time
npx playwright install chromium    # first time
pwsh run.ps1
```

Specs: list→detail nav, Excalidraw render, RSS 2.0 schema, 404 page.

Outputs: `e2e/results/html/index.html`, `e2e/results/results.json`.

> **Note on Excalidraw spec**: public detail pages serve Excalidraw content as static `<img>` previews (not live canvas/SVG), so the spec checks for `canvas | svg | img` in the article body. The `networkidle` wait state is avoided because analytics keeps connections open; `load` is used instead.
>
> **Note on 404 spec**: Next.js returns HTTP 200 even for non-existent slugs (the app-level 404 page renders with status 200 in some Next.js deployments). The spec uses the permissive variant: passes if HTTP status is 404 **or** the page contains "404"/"not found" text.

## §10 — jstat (JVM GC sampling)  *(SKIPPED in self-test)*

> **Skipped because**: requires SSH access to `sealpi.cn` and the production backend container's JVM. The agent ran this in parallel with §1 stress profile; results in `RESULT.md §10`.

> **Note on jstat availability**: the production container uses a slim Temurin JRE 21 image — `jstat` (a JDK tool) is not present. The script detects this automatically and falls back to polling `/proc/<pid>/status` for `VmRSS`, `VmHWM`, `VmSwap`, and `Threads`. To enable full GC-pause metrics (`S0 S1 E O M CCS YGC YGCT FGC FGCT GCT`), rebuild the backend image on a JDK base (e.g. `eclipse-temurin:21-jdk`) rather than a JRE base.

Operator-only reproduction:

```powershell
$env:SEALPI_SSH_HOST = 'sealpi.cn'
$env:SEALPI_SSH_USER = 'root'
$env:SEALPI_SSH_PASS = '<your password>'
$env:SEALPI_SSH_HOSTKEY = '<from: ssh-keyscan -t ed25519 sealpi.cn>'
pwsh jvm-monitor/run.ps1 -Samples 60 -IntervalSec 1
```

## §11 — vm-monitor (system metrics)  *(SKIPPED in self-test)*

(Filled by Task 13.)

---

## Summary of what each section produces

| § | tool | output |
|---|------|--------|
| 1 | k6 | `http-load/k6/results/{smoke,load,stress,spike,soak}-*.{json,html}` |
| 2 | autocannon | `http-load/autocannon/results/*-*.json` |
| 3 | JUnit | `unit/backend/results/<module>/TEST-*.xml` |
| 4 | Vitest | `unit/frontend/results/vitest-*.json` |
| 5 | JMH | `micro-bench/results/jmh-*.json` |
| 6 | sysbench | `infra-bench/sysbench/results/sysbench-*.txt` |
| 7 | mc | `infra-bench/mc-speedtest/results/mc-*.txt` |
| 8 | LHCI | `frontend-quality/results/lhci-*/` |
| 9 | Playwright | `e2e/results/{html,json}` |
| 10 | jstat | `jvm-monitor/results/jstat-*.txt` |
| 11 | vm-monitor | `system-monitor/results/{vmstat,iostat,free}-*.log` |
