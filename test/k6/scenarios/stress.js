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
    // Stage we were in when aborted = floor(actualSec / 60); read the target directly
    // from the stages array (ground truth) instead of recomputing the VU level.
    const stageIdx = Math.min(stages.length - 1, Math.floor(actualSec / 60));
    breakAt = stages[stageIdx].target;
  }

  const note = aborted
    ? `\n=== STRESS BREAK_AT_VU=${breakAt} (aborted at ${actualSec.toFixed(1)}s of ${expectedDurationSec}s expected) ===\n`
    : `\n=== STRESS COMPLETED MAX_VU=${MAX_VU} stable. Re-run with MAX_VU=${MAX_VU * 2} to find break point. ===\n`;

  out.stdout = (out.stdout || '') + note;
  return out;
}
