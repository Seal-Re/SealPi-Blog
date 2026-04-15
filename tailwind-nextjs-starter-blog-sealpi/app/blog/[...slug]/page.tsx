import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import siteMetadata from '@/data/siteMetadata'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import {
  PUBLIC_FETCH_REVALIDATE_SECONDS,
  fetchAllPublishedArticles,
  fetchPublishedArticlesForStaticPaths,
} from '@/lib/public-blog-api'

type PageProps = {
  params: Promise<{ slug: string[] }>
}

export const revalidate = PUBLIC_FETCH_REVALIDATE_SECONDS

async function fetchArticleBySlug(slug: string): Promise<AdminArticle | null> {
  const detailResponse = await fetch(
    buildApiUrl(`/api/v1/articles/slug/${encodeURIComponent(slug)}`),
    { next: { revalidate: PUBLIC_FETCH_REVALIDATE_SECONDS } }
  )

  if (!detailResponse.ok) {
    return null
  }

  const detailPayload = (await detailResponse.json()) as ApiResult<AdminArticle>
  return detailPayload.data || null
}

function getAuthorDetails() {
  return [{ name: siteMetadata.author }]
}

function estimateReadMinutes(markdown?: string | null): number | undefined {
  if (!markdown?.trim()) {
    return undefined
  }
  const words = markdown.trim().split(/\s+/).length
  const minutes = Math.max(1, Math.round(words / 220))
  return minutes
}

type RelatedPost = {
  title: string
  path: string
  summary: string
  coverImageUrl?: string
  tags: string[]
}

async function fetchAdjacentAndRelated(currentUrl: string, currentTags: string[]) {
  const allArticles = await fetchAllPublishedArticles()
  const idx = allArticles.findIndex((a) => a.url === currentUrl)

  const prevRaw = idx > 0 ? allArticles[idx - 1] : null
  const nextRaw = idx < allArticles.length - 1 ? allArticles[idx + 1] : null

  const excludeUrls = new Set([currentUrl, prevRaw?.url, nextRaw?.url].filter(Boolean) as string[])
  const related: RelatedPost[] =
    currentTags.length > 0
      ? allArticles
          .filter((a) => !excludeUrls.has(a.url) && a.tags.some((t) => currentTags.includes(t)))
          .slice(0, 3)
          .map((a) => ({
            title: a.title,
            path: a.path,
            summary: a.summary,
            coverImageUrl: a.coverImageUrl,
            tags: a.tags,
          }))
      : []

  return {
    prev: prevRaw ? { title: prevRaw.title, path: prevRaw.path } : null,
    next: nextRaw ? { title: nextRaw.title, path: nextRaw.path } : null,
    related,
  }
}

function normalizeDate(value?: string) {
  if (!value) {
    return new Date().toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function resolveOgImages(article: AdminArticle) {
  const fallback = siteMetadata.socialBanner
  const images = article.coverImageUrl ? [article.coverImageUrl] : [fallback]

  return images.map((img) => ({
    url: img.includes('http') ? img : `${siteMetadata.siteUrl}${img}`,
  }))
}

export async function generateMetadata(props: PageProps): Promise<Metadata | undefined> {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const article = await fetchArticleBySlug(slug)

  if (!article) {
    return
  }

  const authorDetails = getAuthorDetails()
  const publishedAt = normalizeDate(article.date)
  const modifiedAt = normalizeDate(article.lastmod || article.date)
  const authors = authorDetails.map((author) => author.name)
  const imageList = article.coverImageUrl ? [article.coverImageUrl] : [siteMetadata.socialBanner]

  return {
    title: article.title,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      siteName: siteMetadata.title,
      locale: 'zh_CN',
      type: 'article',
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      url: `/blog/${article.url}`,
      images: resolveOgImages(article),
      authors: authors.length > 0 ? authors : [siteMetadata.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: imageList,
    },
  }
}

export async function generateStaticParams() {
  const articles = await fetchPublishedArticlesForStaticPaths()
  return articles.map((article) => ({
    slug: article.url.split('/').map((name) => decodeURI(name)),
  }))
}

export default async function Page(props: PageProps) {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const article = await fetchArticleBySlug(slug)

  if (!article) {
    return notFound()
  }

  const authorDetails = getAuthorDetails()
  const date = normalizeDate(article.date)
  const summary = article.summary?.trim()
  const currentTags = article.tags?.map((t) => t.name).filter((n): n is string => Boolean(n)) ?? []
  const { prev, next, related } = await fetchAdjacentAndRelated(article.url, currentTags)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    datePublished: date,
    dateModified: normalizeDate(article.lastmod || article.date),
    description: summary || siteMetadata.description,
    image: article.coverImageUrl
      ? [
          article.coverImageUrl.includes('http')
            ? article.coverImageUrl
            : `${siteMetadata.siteUrl}${article.coverImageUrl}`,
        ]
      : [`${siteMetadata.siteUrl}${siteMetadata.socialBanner}`],
    author: authorDetails.map((author) => ({
      '@type': 'Person',
      name: author.name,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WorkbookArticleLayout
        title={article.title}
        date={new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        tags={currentTags}
        readMinutes={estimateReadMinutes(article.bodyMd)}
        viewCount={article.viewCount}
        contentJson={article.contentJson || article.draftJson}
        coverImageUrl={article.coverImageUrl}
        coverCaption={article.coverCaption}
        bodyMd={article.bodyMd}
        prevPost={prev}
        nextPost={next}
        relatedPosts={related}
      />
    </>
  )
}
