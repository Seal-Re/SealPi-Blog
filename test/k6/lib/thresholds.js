// Per-profile thresholds. Per-endpoint variants use tag {endpoint:X} from
// weighted-pick.js so each endpoint's latency is judged independently.
// k6 only emits sub-metrics that have an explicit threshold — we declare
// trivial `count>=0` thresholds on http_reqs{endpoint:X} to surface counts
// in the JSON summary even when no latency gate exists for that profile.
const COUNT_PROBES = {
  'http_reqs{endpoint:tags}':     ['count>=0'],
  'http_reqs{endpoint:list}':     ['count>=0'],
  'http_reqs{endpoint:view}':     ['count>=0'],
  'http_reqs{endpoint:detail}':   ['count>=0'],
  'http_reqs{endpoint:adjacent}': ['count>=0'],
  'http_req_failed{endpoint:tags}':     ['rate<=1'],
  'http_req_failed{endpoint:list}':     ['rate<=1'],
  'http_req_failed{endpoint:view}':     ['rate<=1'],
  'http_req_failed{endpoint:detail}':   ['rate<=1'],
  'http_req_failed{endpoint:adjacent}': ['rate<=1'],
};

// Endpoint cost expectations (informed by smoke baseline):
//   tags    — cheapest (small list)
//   list    — cheap (paginated 10)
//   view    — small write
//   detail  — medium (single article + tags + body_md)
//   adjacent — heaviest (prev/next/related lookup over tag overlap)
export const thresholds = {
  smoke: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<2000'],
    // Loose per-endpoint signals — purpose is to surface the sub-metrics in
    // the JSON summary, not to gate. Threshold values are intentionally lax.
    'http_req_duration{endpoint:tags}':     ['p(95)<3000'],
    'http_req_duration{endpoint:list}':     ['p(95)<3000'],
    'http_req_duration{endpoint:view}':     ['p(95)<3000'],
    'http_req_duration{endpoint:detail}':   ['p(95)<3000'],
    'http_req_duration{endpoint:adjacent}': ['p(95)<3000'],
    ...COUNT_PROBES,
  },
  load: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<600', 'p(99)<1500'],
    'http_req_duration{endpoint:tags}':     ['p(95)<300'],
    'http_req_duration{endpoint:list}':     ['p(95)<500'],
    'http_req_duration{endpoint:view}':     ['p(95)<500'],
    'http_req_duration{endpoint:detail}':   ['p(95)<700'],
    'http_req_duration{endpoint:adjacent}': ['p(95)<800'],
    ...COUNT_PROBES,
  },
  stress: {
    // Global abort on system-wide failure or p99 blow-up.
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' },
    ],
    'http_req_duration': [
      { threshold: 'p(99)<1500', abortOnFail: true, delayAbortEval: '30s' },
    ],
    // Soft per-endpoint signals (no abort) — surfaces which endpoint cracks first.
    'http_req_duration{endpoint:tags}':     ['p(95)<800'],
    'http_req_duration{endpoint:list}':     ['p(95)<1000'],
    'http_req_duration{endpoint:view}':     ['p(95)<1000'],
    'http_req_duration{endpoint:detail}':   ['p(95)<1500'],
    'http_req_duration{endpoint:adjacent}': ['p(95)<2000'],
    ...COUNT_PROBES,
  },
  spike: {
    'http_req_failed': ['rate<0.10'],
    // Spike is record-only — these surface per-endpoint sub-metrics without gating.
    'http_req_duration{endpoint:tags}':     ['p(95)<5000'],
    'http_req_duration{endpoint:list}':     ['p(95)<5000'],
    'http_req_duration{endpoint:view}':     ['p(95)<5000'],
    'http_req_duration{endpoint:detail}':   ['p(95)<5000'],
    'http_req_duration{endpoint:adjacent}': ['p(95)<5000'],
    ...COUNT_PROBES,
  },
  soak: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<700'],
    'http_req_duration{endpoint:list}':     ['p(95)<600'],
    'http_req_duration{endpoint:detail}':   ['p(95)<800'],
    'http_req_duration{endpoint:adjacent}': ['p(95)<1000'],
    ...COUNT_PROBES,
  },
};
