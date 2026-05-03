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
