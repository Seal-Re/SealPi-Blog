import http from 'k6/http';
import { group, check } from 'k6';
import { BASE_URL, HTTP_DEFAULTS } from './config.js';
import { pickArticle } from './pool.js';

// Per-endpoint params: HTTP_DEFAULTS + a tag so http_req_* metrics can be
// filtered/thresholded per endpoint via {endpoint:list} etc.
function paramsFor(endpoint) {
  return {
    ...HTTP_DEFAULTS,
    tags: { endpoint },
  };
}

const P_LIST     = paramsFor('list');
const P_DETAIL   = paramsFor('detail');
const P_ADJACENT = paramsFor('adjacent');
const P_TAGS     = paramsFor('tags');
const P_VIEW     = paramsFor('view');

function hitList() {
  group('list', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles?pageIndex=1&pageSize=10`, P_LIST);
    check(res, { 'list 200': (r) => r.status === 200 });
  });
}

function hitDetailSlug() {
  const a = pickArticle();
  group('detail', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles/slug/${encodeURIComponent(a.slug)}`, P_DETAIL);
    check(res, { 'detail 200': (r) => r.status === 200 });
  });
}

function hitAdjacent() {
  const a = pickArticle();
  const tagParams = (a.tags || []).map((t) => `&tags=${encodeURIComponent(t)}`).join('');
  group('adjacent', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles/adjacent?slug=${encodeURIComponent(a.slug)}${tagParams}`, P_ADJACENT);
    check(res, { 'adjacent 200': (r) => r.status === 200 });
  });
}

function hitTags() {
  group('tags', () => {
    const res = http.get(`${BASE_URL}/api/v1/tags`, P_TAGS);
    check(res, { 'tags 200': (r) => r.status === 200 });
  });
}

function hitViewPost() {
  const a = pickArticle();
  group('view', () => {
    const res = http.post(`${BASE_URL}/api/v1/articles/${a.id}/view`, null, P_VIEW);
    // view endpoint is no-op-on-error per backend contract; accept any 2xx
    check(res, { 'view 2xx': (r) => r.status >= 200 && r.status < 300 });
  });
}

const weighted = [
  { fn: hitList,       w: 50 },
  { fn: hitDetailSlug, w: 30 },
  { fn: hitAdjacent,   w: 10 },
  { fn: hitTags,       w:  5 },
  { fn: hitViewPost,   w:  5 },
];

const totalWeight = weighted.reduce((s, x) => s + x.w, 0);

export function runWeighted() {
  let r = Math.random() * totalWeight;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) {
      item.fn();
      return;
    }
  }
}
