import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, POOL_SIZE, HTTP_DEFAULTS } from '../lib/config.js';

export const options = {
  scenarios: {
    bootstrap: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
  },
};

// Defensive: real API returns body.data as the array; some shapes wrap as body.data.data.
function extractItems(body) {
  if (!body) return [];
  if (Array.isArray(body.data)) return body.data;
  if (body.data && Array.isArray(body.data.data)) return body.data.data;
  return [];
}

// Defensive: real /api/v1/tags returns top-level array; some shapes wrap as { data: [...] }.
function extractTagArray(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.data)) return body.data;
  return [];
}

function tagToName(t) {
  if (typeof t === 'string') return t;
  if (t && typeof t.name === 'string') return t.name;
  return null;
}

// VU function: just verify the API is reachable.
export default function () {
  const res = http.get(`${BASE_URL}/api/v1/articles?page=1&size=20`, HTTP_DEFAULTS);
  check(res, { 'list 200': (r) => r.status === 200 });
}

// handleSummary has network access in k6 and runs after all VUs finish.
// We build the pool here so data doesn't need to cross the VU/summary context boundary.
export function handleSummary() {
  const articles = [];
  const pageSize = 20;
  let page = 1;

  while (articles.length < POOL_SIZE) {
    const res = http.get(`${BASE_URL}/api/v1/articles?page=${page}&size=${pageSize}`, HTTP_DEFAULTS);
    if (res.status !== 200) break;

    const items = extractItems(res.json());
    if (items.length === 0) break;

    for (const it of items) {
      if (articles.length >= POOL_SIZE) break;
      const id = it.articleId != null ? it.articleId : it.id;
      if (!it.url || id == null) continue;
      const tags = Array.isArray(it.tags) ? it.tags.map(tagToName).filter(Boolean) : [];
      articles.push({ id, slug: it.url, tags });
    }
    if (items.length < pageSize) break;
    page += 1;
  }

  const tagRes = http.get(`${BASE_URL}/api/v1/tags`, HTTP_DEFAULTS);
  const tags = extractTagArray(tagRes.json()).map(tagToName).filter(Boolean);

  if (articles.length === 0) {
    throw new Error('Bootstrap failed: zero published articles found');
  }

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    articles,
    tags,
  };

  return {
    'stdout': `Bootstrap OK: ${articles.length} articles, ${tags.length} tags\n`,
    'data/pool.json': JSON.stringify(out, null, 2),
  };
}
