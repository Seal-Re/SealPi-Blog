/**
 * RSS feed generator — fetches published articles from the Java backend API.
 *
 * Called by postbuild.mjs after `next build`. If the backend is unreachable
 * (e.g. CI environment without a running backend), writes a minimal valid feed
 * so the build still succeeds.
 */
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { escape } from 'pliny/utils/htmlEscaper.js'
import siteMetadata from '../data/siteMetadata.js'

const API_BASE = (
  process.env.BLOG_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BLOG_API_BASE_URL ||
  'http://127.0.0.1:8080'
).replace(/\/$/, '')

const PAGE_SIZE = 100
const OUTPUT_DIR = process.env.EXPORT ? 'out' : 'public'

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchAllPublishedArticles() {
  const items = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${API_BASE}/api/v1/articles?pageIndex=${page}&pageSize=${PAGE_SIZE}&status=published`
    let res
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    } catch {
      console.warn(`[rss] Backend unreachable at ${API_BASE} — skipping article fetch.`)
      break
    }
    if (!res.ok) {
      console.warn(`[rss] Backend returned ${res.status} for page ${page}`)
      break
    }
    const payload = await res.json()
    const data = payload.data || []
    items.push(...data)
    const total = payload.totalPage || payload.totalPages || 1
    totalPages = total
    if (data.length === 0) break
    page++
  }

  return items
}

// ---------------------------------------------------------------------------
// RSS generation helpers
// ---------------------------------------------------------------------------

function rssDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString()
}

function tagCategories(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return ''
  return tags.map((t) => `<category>${escape(t.name ?? t)}</category>`).join('')
}

function buildItem(config, article) {
  const url = article.url || ''
  const title = article.title || '(untitled)'
  const summary = article.summary || ''
  const date = rssDate(article.date)
  const tags = article.tags || []

  return `
  <item>
    <guid>${config.siteUrl}/blog/${escape(url)}</guid>
    <title>${escape(title)}</title>
    <link>${config.siteUrl}/blog/${escape(url)}</link>
    ${summary ? `<description>${escape(summary)}</description>` : ''}
    <pubDate>${date}</pubDate>
    <author>${escape(config.email || '')} (${escape(config.author || '')})</author>
    ${tagCategories(tags)}
  </item>`
}

function buildFeed(config, articles, feedPath) {
  const lastBuildDate =
    articles.length > 0 ? rssDate(articles[0].date) : new Date().toUTCString()

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(config.title)}</title>
    <link>${config.siteUrl}/blog</link>
    <description>${escape(config.description)}</description>
    <language>${config.language || 'zh-CN'}</language>
    <managingEditor>${escape(config.email || '')} (${escape(config.author || '')})</managingEditor>
    <webMaster>${escape(config.email || '')} (${escape(config.author || '')})</webMaster>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${config.siteUrl}/${feedPath}" rel="self" type="application/rss+xml"/>
    ${articles.map((a) => buildItem(config, a)).join('')}
  </channel>
</rss>`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function generateRSS() {
  const articles = await fetchAllPublishedArticles()

  // Sort by date descending (most recent first)
  articles.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0
    const db = b.date ? new Date(b.date).getTime() : 0
    return db - da
  })

  // Main feed
  const feedXml = buildFeed(siteMetadata, articles, 'feed.xml')
  writeFileSync(path.join(OUTPUT_DIR, 'feed.xml'), feedXml)
  console.log(`[rss] Wrote ${OUTPUT_DIR}/feed.xml (${articles.length} articles)`)

  // Per-tag feeds
  const tagMap = new Map()
  for (const article of articles) {
    for (const tag of article.tags || []) {
      const tagName = tag.name ?? tag
      if (!tagName) continue
      if (!tagMap.has(tagName)) tagMap.set(tagName, [])
      tagMap.get(tagName).push(article)
    }
  }

  for (const [tagName, tagArticles] of tagMap) {
    const tagDir = path.join(OUTPUT_DIR, 'tags', tagName)
    mkdirSync(tagDir, { recursive: true })
    const tagFeedPath = `tags/${tagName}/feed.xml`
    const tagFeedXml = buildFeed(siteMetadata, tagArticles, tagFeedPath)
    writeFileSync(path.join(tagDir, 'feed.xml'), tagFeedXml)
  }

  if (tagMap.size > 0) {
    console.log(`[rss] Wrote per-tag feeds for ${tagMap.size} tag(s)`)
  }
}

export default generateRSS
