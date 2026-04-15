import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { fetchPublishedArticlesForStaticPaths } from '@/lib/public-blog-api'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = siteMetadata.siteUrl

  const articles = await fetchPublishedArticlesForStaticPaths()
  const blogRoutes = articles.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.date,
  }))

  const routes = ['', 'blog', 'projects', 'tags'].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }))

  return [...routes, ...blogRoutes]
}
