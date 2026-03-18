import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'

export const BLOG_POSTS_PER_PAGE = 5
export const PUBLIC_ARTICLE_PRELOAD_SIZE = 100

type PublishedArticleListItem = Omit<
  Pick<
    AdminArticle,
    'articleId' | 'title' | 'url' | 'summary' | 'coverImageUrl' | 'viewCount' | 'date' | 'tags'
  >,
  'tags'
> & {
  tags?: AdminArticle['tags']
}

export type PublicBlogPost = Omit<PublishedArticleListItem, 'summary' | 'date' | 'tags'> & {
  path: string
  slug: string
  summary: string
  date: string
  tags: string[]
}

function normalizeDate(value?: string) {
  if (!value) {
    return new Date().toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function normalizeTags(tags?: AdminArticle['tags']): string[] {
  if (!tags?.length) {
    return []
  }

  return tags.map((tag) => tag.name).filter((name): name is string => Boolean(name))
}

function toPublicPost(article: PublishedArticleListItem): PublicBlogPost {
  return {
    articleId: article.articleId,
    title: article.title,
    url: article.url,
    coverImageUrl: article.coverImageUrl,
    viewCount: article.viewCount,
    path: `blog/${article.url}`,
    slug: article.url,
    summary: article.summary?.trim() || '该文章暂无摘要。',
    date: normalizeDate(article.date),
    tags: normalizeTags(article.tags),
  }
}

export async function fetchPublishedArticlesPage(
  pageIndex: number,
  pageSize = BLOG_POSTS_PER_PAGE
) {
  const response = await fetch(
    buildApiUrl(`/api/v1/articles?pageIndex=${pageIndex}&pageSize=${pageSize}&draft=1`),
    {
      next: { revalidate: 60 },
    }
  )

  if (!response.ok) {
    return {
      items: [] as PublicBlogPost[],
      totalCount: 0,
      pageIndex,
      pageSize,
      totalPages: 1,
    }
  }

  const payload = (await response.json()) as PageResult<PublishedArticleListItem>
  const totalCount = payload.totalCount || 0
  const resolvedPageSize = payload.pageSize || pageSize
  const resolvedPageIndex = payload.pageIndex || pageIndex
  const totalPages = Math.max(payload.totalPage || Math.ceil(totalCount / resolvedPageSize) || 1, 1)

  return {
    items: (payload.data || []).map(toPublicPost),
    totalCount,
    pageIndex: resolvedPageIndex,
    pageSize: resolvedPageSize,
    totalPages,
  }
}

export async function fetchPublishedArticles(options?: { pageSize?: number }) {
  const response = await fetchPublishedArticlesPage(1, options?.pageSize || BLOG_POSTS_PER_PAGE)
  return response.items
}

export async function fetchPublishedArticlesForStaticPaths() {
  return fetchPublishedArticles({ pageSize: PUBLIC_ARTICLE_PRELOAD_SIZE })
}
