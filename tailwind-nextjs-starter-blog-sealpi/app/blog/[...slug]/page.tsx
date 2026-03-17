import { coreContent } from 'pliny/utils/contentlayer'
import { allAuthors } from 'contentlayer/generated'
import type { Authors } from 'contentlayer/generated'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DynamicPostLayout from '@/layouts/DynamicPostLayout'
import ExcalidrawViewer from '@/components/ExcalidrawViewer'
import siteMetadata from '@/data/siteMetadata'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ApiResult, PageResult } from '@/lib/blog-api-types'

type ArticleListItem = Pick<
  AdminArticle,
  'articleId' | 'title' | 'url' | 'summary' | 'coverImageUrl' | 'viewCount' | 'date'
>

type PageProps = {
  params: Promise<{ slug: string[] }>
}

async function fetchArticleBySlug(slug: string): Promise<AdminArticle | null> {
  const response = await fetch(buildApiUrl('/api/v1/articles?pageIndex=1&pageSize=100'), {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as PageResult<ArticleListItem>
  const matched = payload.data?.find((article) => article.url === slug)

  if (!matched?.articleId) {
    return null
  }

  const detailResponse = await fetch(buildApiUrl(`/api/v1/articles/${matched.articleId}`), {
    next: { revalidate: 60 },
  })

  if (!detailResponse.ok) {
    return null
  }

  const detailPayload = (await detailResponse.json()) as ApiResult<AdminArticle>
  return detailPayload.data || null
}

async function fetchPublishedArticles(): Promise<ArticleListItem[]> {
  const response = await fetch(buildApiUrl('/api/v1/articles?pageIndex=1&pageSize=100'), {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as PageResult<ArticleListItem>
  return payload.data || []
}

function getAuthorDetails() {
  const authorResults = allAuthors.find((author) => author.slug === 'default')
  return [coreContent(authorResults as Authors)]
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
  const articles = await fetchPublishedArticles()
  return articles.map((article) => ({
    slug: article.url.split('/').map((name) => decodeURI(name)),
  }))
}

export default async function Page(props: PageProps) {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const [article, publishedArticles] = await Promise.all([
    fetchArticleBySlug(slug),
    fetchPublishedArticles(),
  ])

  if (!article) {
    return notFound()
  }

  const postIndex = publishedArticles.findIndex((item) => item.url === slug)
  const prevArticle = postIndex >= 0 ? publishedArticles[postIndex + 1] : undefined
  const nextArticle = postIndex > 0 ? publishedArticles[postIndex - 1] : undefined
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
      <DynamicPostLayout
        content={{
          path: 'blog',
          slug: article.url,
          title: article.title,
          summary,
          date,
          lastmod: article.lastmod,
          tags: ['excalidraw', 'visual-story'],
          coverImageUrl: article.coverImageUrl,
        }}
        authorDetails={authorDetails}
        prev={
          prevArticle
            ? {
                path: `blog/${prevArticle.url}`,
                title: prevArticle.title,
              }
            : undefined
        }
        next={
          nextArticle
            ? {
                path: `blog/${nextArticle.url}`,
                title: nextArticle.title,
              }
            : undefined
        }
      >
        <ExcalidrawViewer
          contentJson={article.contentJson || article.draftJson}
          title={article.title}
        />
      </DynamicPostLayout>
    </>
  )
}
