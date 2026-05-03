import { SharedArray } from 'k6/data';

const raw = new SharedArray('pool', () => {
  const data = JSON.parse(open('../data/pool.json'));
  return [data];
});

const pool = raw[0];

export const articles = new SharedArray('articles', () => pool.articles);
export const tags = new SharedArray('tags', () => pool.tags);

export function pickArticle() {
  return articles[Math.floor(Math.random() * articles.length)];
}

export function pickTag() {
  if (tags.length === 0) return null;
  return tags[Math.floor(Math.random() * tags.length)];
}
