import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import {
  BLOG_POSTS_PER_PAGE,
  fetchAllPublishedArticles,
  fetchPublishedTags,
} from '@/lib/public-blog-api'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = siteMetadata.siteUrl

  const [articles, tags] = await Promise.all([fetchAllPublishedArticles(), fetchPublishedTags()])

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/blog/${article.url}`,
    lastModified: new Date(article.lastmod ?? article.date),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${siteUrl}/tags/${tag.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  // Paginated blog listing pages (/blog/page/N)
  const totalBlogPages = Math.max(1, Math.ceil(articles.length / BLOG_POSTS_PER_PAGE))
  const paginatedBlogRoutes: MetadataRoute.Sitemap = Array.from(
    { length: totalBlogPages },
    (_, i) => ({
      url: `${siteUrl}/blog/page/${i + 1}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })
  )

  // Paginated tag pages (/tags/[slug]/page/N)
  const paginatedTagRoutes: MetadataRoute.Sitemap = tags.flatMap((tag) => {
    const totalPages = Math.max(1, Math.ceil(tag.count / BLOG_POSTS_PER_PAGE))
    return Array.from({ length: totalPages }, (_, i) => ({
      url: `${siteUrl}/tags/${tag.slug}/page/${i + 1}`,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    }))
  })

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/tags`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/archive`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${siteUrl}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/projects`, changeFrequency: 'monthly', priority: 0.4 },
  ]

  return [
    ...staticRoutes,
    ...articleRoutes,
    ...tagRoutes,
    ...paginatedBlogRoutes,
    ...paginatedTagRoutes,
  ]
}
