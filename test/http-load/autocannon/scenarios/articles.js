import autocannon from 'autocannon';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.env.BASE_URL ?? 'https://blog.sealpi.cn';
const path = '/api/v1/articles?page=1&size=10';
const duration = Number(process.env.DURATION ?? 30);
const connections = Number(process.env.CONNECTIONS ?? 50);
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const out = `results/articles-${ts}.json`;

mkdirSync(dirname(out), { recursive: true });

const inst = autocannon({ url: `${url}${path}`, connections, duration, headers: { accept: 'application/json' } });
autocannon.track(inst, { renderProgressBar: true });

inst.on('done', (result) => {
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${out}`);
  console.log(`req/s p50=${result.requests.p50}  p99=${result.requests.p99}  errors=${result.errors}  non2xx=${result.non2xx}`);
});
