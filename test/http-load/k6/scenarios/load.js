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
