import { fetchPublishedArticlesPage, fetchPublishedTags } from '@/lib/public-blog-api'
import siteMetadata from '@/data/siteMetadata'

export const revalidate = 3600

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(_req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag: tagSlug } = await params
  const decodedSlug = decodeURIComponent(tagSlug)

  const availableTags = await fetchPublishedTags()
  const currentTag = availableTags.find((t) => t.slug === decodedSlug)
  const tagName = currentTag?.name || decodedSlug.replace(/-/g, ' ')

  const response = await fetchPublishedArticlesPage(1, 50, tagName)
  const siteUrl = siteMetadata.siteUrl

  const items = response.items
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`
      const pubDate = new Date(post.date).toUTCString()
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.summary)}</description>
    </item>`
    })
    .join('')

  const feedUrl = `${siteUrl}/tags/${decodedSlug}/feed.xml`
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${siteMetadata.title} — ${tagName}`)}</title>
    <link>${siteUrl}/tags/${decodedSlug}</link>
    <description>${escapeXml(`${siteMetadata.title} posts tagged "${tagName}"`)}</description>
    <language>${siteMetadata.language}</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
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
