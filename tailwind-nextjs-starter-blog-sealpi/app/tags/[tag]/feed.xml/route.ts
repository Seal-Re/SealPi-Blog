import { fetchAllPublishedArticles, fetchPublishedTags } from '@/lib/public-blog-api'
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

/**
 * Per-tag RSS 2.0 feed.
 * Mirrors the format of /feed.xml but filtered to a single tag.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag: tagSlug } = await params

  const [allTags, allArticles] = await Promise.all([
    fetchPublishedTags(),
    fetchAllPublishedArticles(),
  ])

  const currentTag = allTags.find((t) => t.slug === tagSlug)
  const tagName = currentTag?.name || tagSlug.replace(/-/g, ' ')

  const filtered = allArticles.filter((post) =>
    post.tags.some((t) => t.toLowerCase() === tagName.toLowerCase())
  )

  const siteUrl = siteMetadata.siteUrl
  const feedUrl = `${siteUrl}/tags/${encodeURIComponent(tagSlug)}/feed.xml`

  const latestModified = filtered.reduce((latest, post) => {
    const modified = new Date(post.lastmod ?? post.date)
    return modified > latest ? modified : latest
  }, new Date(0))

  const items = filtered
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`
      const pubDate = new Date(post.date).toUTCString()
      const categories = post.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('')
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
      ${categories}
      ${cover}
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`${siteMetadata.title} — ${tagName}`)}</title>
    <link>${siteUrl}/tags/${encodeURIComponent(tagSlug)}</link>
    <description>${escapeXml(`${siteMetadata.title} — 标签「${tagName}」相关文章`)}</description>
    <language>${siteMetadata.language}</language>
    <lastBuildDate>${latestModified.toUTCString()}</lastBuildDate>
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
