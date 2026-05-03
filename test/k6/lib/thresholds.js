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
