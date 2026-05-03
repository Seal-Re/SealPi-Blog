import { test, expect, request } from '@playwright/test';
import { XMLParser } from 'fast-xml-parser';

test('RSS feed is well-formed RSS 2.0', async ({ baseURL }) => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${baseURL}/feed.xml`);
  expect(res.status(), 'feed.xml HTTP status').toBe(200);
  expect(res.headers()['content-type']).toMatch(/xml/);

  const xml = await res.text();
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  expect(parsed.rss).toBeDefined();
  expect(parsed.rss['@_version']).toBe('2.0');
  expect(parsed.rss.channel.title).toBeTruthy();
  expect(parsed.rss.channel.link).toBeTruthy();
  expect(parsed.rss.channel.description).toBeTruthy();
  expect(parsed.rss.channel.item).toBeDefined();
});
