import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import siteMetadata from '@/data/siteMetadata'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import { isPublishedStatus } from '@/lib/article-status'
import {
  PUBLIC_FETCH_REVALIDATE_SECONDS,
  fetchAdjacentBySlug,
  fetchPublishedArticlesForStaticPaths,
} from '@/lib/public-blog-api'

type PageProps = {
  params: Promise<{ slug: string[] }>
}

export const revalidate = 300

async function fetchArticleBySlug(slug: string): Promise<AdminArticle | null> {
  let detailResponse: Response
  try {
    detailResponse = await fetch(buildApiUrl(`/api/v1/articles/slug/${encodeURIComponent(slug)}`), {
      next: { revalidate: PUBLIC_FETCH_REVALIDATE_SECONDS },
    })
  } catch {
    return null
  }
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
  // Count CJK characters and Latin words separately for accurate mixed-content estimates.
  // CJK reading speed ~300 chars/min; English ~220 words/min.
  const cjk = (markdown.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
  const latin = markdown.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ').trim()
  const latinWords = latin ? latin.split(/\s+/).filter(Boolean).length : 0
  const minutes = Math.max(1, Math.round(cjk / 300 + latinWords / 220))
  return minutes
}

type RelatedPost = {
  title: string
  path: string
  summary: string
  coverImageUrl?: string
  tags: string[]
  date?: string
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

  if (!article || !isPublishedStatus(article.draft)) {
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
    alternates: {
      canonical: `${siteMetadata.siteUrl}/blog/${article.url}`,
    },
    openGraph: {
      title: article.title,
      description: article.summary,
      siteName: siteMetadata.title,
      locale: 'zh_CN',
      type: 'article',
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      url: `${siteMetadata.siteUrl}/blog/${article.url}`,
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

  if (!article || !isPublishedStatus(article.draft)) {
    return notFound()
  }

  const authorDetails = getAuthorDetails()
  const dateIso = normalizeDate(article.date)
  const lastmodIso = article.lastmod ? normalizeDate(article.lastmod) : undefined
  const summary = article.summary?.trim()
  const currentTags = article.tags?.map((t) => t.name).filter((n): n is string => Boolean(n)) ?? []
  const adjacent = await fetchAdjacentBySlug(article.url, currentTags)
  const prev = adjacent.prev
    ? { title: adjacent.prev.title, path: `blog/${adjacent.prev.url}`, date: adjacent.prev.date }
    : null
  const next = adjacent.next
    ? { title: adjacent.next.title, path: `blog/${adjacent.next.url}`, date: adjacent.next.date }
    : null
  const related: RelatedPost[] = (adjacent.related ?? []).map((r) => ({
    title: r.title,
    path: `blog/${r.url}`,
    summary: r.summary ?? '该文章暂无摘要。',
    coverImageUrl: r.coverImageUrl,
    tags: r.tags ?? [],
    date: r.date,
  }))
  const articleUrl = `${siteMetadata.siteUrl}/blog/${article.url}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    url: articleUrl,
    datePublished: dateIso,
    dateModified: normalizeDate(article.lastmod || article.date),
    description: summary || siteMetadata.description,
    keywords: currentTags.length > 0 ? currentTags.join(', ') : undefined,
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
        dateIso={dateIso}
        lastmodIso={lastmodIso}
        tags={currentTags}
        readMinutes={estimateReadMinutes(article.bodyMd)}
        viewCount={article.viewCount}
        contentJson={article.contentJson || article.draftJson}
        coverImageUrl={article.coverImageUrl}
        coverCaption={article.coverCaption}
        bodyMd={article.bodyMd}
        articleId={article.articleId}
        slug={slug}
        prevPost={prev}
        nextPost={next}
        relatedPosts={related}
      />
    </>
  )
}
