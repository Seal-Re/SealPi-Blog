import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import siteMetadata from '@/data/siteMetadata'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import {
  PUBLIC_FETCH_REVALIDATE_SECONDS,
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
        tags={
          article.tags
            ?.map((tag) => tag.name)
            .filter((name): name is string => Boolean(name)) || []
        }
        readMinutes={undefined}
        contentJson={article.contentJson || article.draftJson}
        coverImageUrl={article.coverImageUrl}
        coverCaption={article.coverCaption}
        bodyMd={article.bodyMd}
      />
    </>
  )
}
