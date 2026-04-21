import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { slug as toSlug } from 'github-slugger'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import siteMetadata from '@/data/siteMetadata'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import { isPublishedStatus } from '@/lib/article-status'
import { estimateReadMinutes } from '@/lib/read-time'
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
  if (article.coverImageUrl) {
    const url = article.coverImageUrl.startsWith('http')
      ? article.coverImageUrl
      : `${siteMetadata.siteUrl}${article.coverImageUrl}`
    return [{ url }]
  }
  // No cover image — generate a branded OG card via the /api/og route.
  return [{ url: `${siteMetadata.siteUrl}/api/og?slug=${encodeURIComponent(article.url)}` }]
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
  const ogImages = resolveOgImages(article)

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
      images: ogImages,
      authors: authors.length > 0 ? authors : [siteMetadata.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: ogImages.map((img) => img.url),
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
    ? {
        title: adjacent.prev.title,
        path: `blog/${adjacent.prev.url}`,
        date: adjacent.prev.date,
        coverImageUrl: adjacent.prev.coverImageUrl,
      }
    : null
  const next = adjacent.next
    ? {
        title: adjacent.next.title,
        path: `blog/${adjacent.next.url}`,
        date: adjacent.next.date,
        coverImageUrl: adjacent.next.coverImageUrl,
      }
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
  const readMins = article.readMinutes ?? estimateReadMinutes(article.bodyMd)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    url: articleUrl,
    inLanguage: siteMetadata.language,
    datePublished: dateIso,
    dateModified: normalizeDate(article.lastmod || article.date),
    description: summary || siteMetadata.description,
    keywords: currentTags.length > 0 ? currentTags.join(', ') : undefined,
    timeRequired: readMins != null ? `PT${readMins}M` : undefined,
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
      url: `${siteMetadata.siteUrl}/about`,
    })),
    publisher: {
      '@type': 'Person',
      name: siteMetadata.author,
      url: `${siteMetadata.siteUrl}/about`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteMetadata.title, item: siteMetadata.siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: '文章',
        item: `${siteMetadata.siteUrl}/blog`,
      },
      { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <WorkbookArticleLayout
        title={article.title}
        dateIso={dateIso}
        lastmodIso={lastmodIso}
        tags={currentTags}
        readMinutes={readMins}
        viewCount={article.viewCount}
        contentJson={article.contentJson}
        coverImageUrl={article.coverImageUrl}
        coverCaption={article.coverCaption}
        bodyMd={article.bodyMd}
        articleId={article.articleId}
        slug={slug}
        eyebrow={currentTags[0] || '随笔'}
        eyebrowHref={currentTags[0] ? `/tags/${toSlug(currentTags[0]) || currentTags[0]}` : '/blog'}
        prevPost={prev}
        nextPost={next}
        relatedPosts={related}
      />
    </>
  )
}
