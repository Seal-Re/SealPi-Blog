import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { SCENARIO } from './config.js';

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function makeHandleSummary(opts = {}) {
  const name = opts.scenario || SCENARIO;
  return function handleSummary(data) {
    const stamp = ts();
    return {
      'stdout': textSummary(data, { indent: ' ', enableColors: true }),
      [`results/${name}-${stamp}.json`]: JSON.stringify(data, null, 2),
      [`results/${name}-${stamp}.html`]: htmlReport(data, { title: `k6 ${name} ${stamp}` }),
    };
  };
}
