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
