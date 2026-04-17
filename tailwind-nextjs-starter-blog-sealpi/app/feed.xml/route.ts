import { fetchAllPublishedArticles } from '@/lib/public-blog-api'
import siteMetadata from '@/data/siteMetadata'

export const revalidate = 3600 // 1-hour ISR cache

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Generates an RSS 2.0 feed from backend articles.
 * Overrides the stale static public/feed.xml file.
 */
export async function GET() {
  const articles = await fetchAllPublishedArticles()
  const siteUrl = siteMetadata.siteUrl

  const latestModified = articles.reduce((latest, post) => {
    const modified = new Date(post.lastmod ?? post.date)
    return modified > latest ? modified : latest
  }, new Date(0))

  const items = articles
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`
      const pubDate = new Date(post.date).toUTCString()
      const tags = post.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('')
      const cover = post.coverImageUrl
        ? `<media:content url="${escapeXml(post.coverImageUrl)}" medium="image"/>`
        : ''

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.summary)}</description>
      ${tags}
      ${cover}
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(siteMetadata.title)}</title>
    <link>${siteUrl}/blog</link>
    <description>${escapeXml(siteMetadata.description)}</description>
    <language>${siteMetadata.language}</language>
    <lastBuildDate>${latestModified.toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
