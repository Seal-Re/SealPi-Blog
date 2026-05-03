import http from 'k6/http';
import { group, check } from 'k6';
import { BASE_URL, HTTP_DEFAULTS } from './config.js';
import { pickArticle } from './pool.js';

function hitList() {
  group('list', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles?pageIndex=1&pageSize=10`, HTTP_DEFAULTS);
    check(res, { 'list 200': (r) => r.status === 200 });
  });
}

function hitDetailSlug() {
  const a = pickArticle();
  group('detail_slug', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles/slug/${encodeURIComponent(a.slug)}`, HTTP_DEFAULTS);
    check(res, { 'detail 200': (r) => r.status === 200 });
  });
}

function hitAdjacent() {
  const a = pickArticle();
  const tagParams = (a.tags || []).map((t) => `&tags=${encodeURIComponent(t)}`).join('');
  group('adjacent', () => {
    const res = http.get(`${BASE_URL}/api/v1/articles/adjacent?slug=${encodeURIComponent(a.slug)}${tagParams}`, HTTP_DEFAULTS);
    check(res, { 'adjacent 200': (r) => r.status === 200 });
  });
}

function hitTags() {
  group('tags', () => {
    const res = http.get(`${BASE_URL}/api/v1/tags`, HTTP_DEFAULTS);
    check(res, { 'tags 200': (r) => r.status === 200 });
  });
}

function hitViewPost() {
  const a = pickArticle();
  group('view_post', () => {
    const res = http.post(`${BASE_URL}/api/v1/articles/${a.id}/view`, null, HTTP_DEFAULTS);
    // view endpoint is no-op-on-error per backend contract; accept 200/204
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
  weighted[0].fn();
}
