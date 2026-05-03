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
