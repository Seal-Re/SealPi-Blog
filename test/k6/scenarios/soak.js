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
