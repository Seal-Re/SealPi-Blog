import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { fetchAllPublishedArticles, fetchPublishedTags } from '@/lib/public-blog-api'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = siteMetadata.siteUrl

  const [articles, tags] = await Promise.all([fetchAllPublishedArticles(), fetchPublishedTags()])

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/blog/${article.url}`,
    lastModified: new Date(article.date),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${siteUrl}/tags/${tag.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/tags`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/projects`, changeFrequency: 'monthly', priority: 0.4 },
  ]

  return [...staticRoutes, ...articleRoutes, ...tagRoutes]
}
