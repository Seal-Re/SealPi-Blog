import { slug } from 'github-slugger'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ArticleTag, PageResult } from '@/lib/blog-api-types'

export const BLOG_POSTS_PER_PAGE = 5
export const PUBLIC_ARTICLE_PRELOAD_SIZE = 50
export const PUBLIC_FETCH_REVALIDATE_SECONDS = 300

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

export type PublicTag = {
  name: string
  slug: string
  count: number
}

export type PublicArticlePage = {
  items: PublicBlogPost[]
  totalCount: number
  pageIndex: number
  pageSize: number
  totalPages: number
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

function normalizeTagName(name?: string | null) {
  return name?.trim() || ''
}

function mergeTagCounts(tagMap: Map<string, PublicTag>, tags?: ArticleTag[]) {
  if (!tags?.length) {
    return
  }

  tags.forEach((tag) => {
    const name = normalizeTagName(tag.name)
    if (!name) {
      return
    }

    const tagSlug = slug(name)
    const current = tagMap.get(tagSlug)
    const nextCount =
      typeof tag.count === 'number' && tag.count > 0 ? tag.count : (current?.count || 0) + 1

    tagMap.set(tagSlug, {
      name,
      slug: tagSlug,
      count: nextCount,
    })
  })
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
  pageSize = BLOG_POSTS_PER_PAGE,
  tag?: string
): Promise<PublicArticlePage> {
  const searchParams = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: String(pageSize),
    status: 'published',
  })

  const normalizedTag = normalizeTagName(tag)
  if (normalizedTag) {
    searchParams.set('keyword', normalizedTag)
    searchParams.set('tag', normalizedTag)
  }

  const response = await fetch(buildApiUrl(`/api/v1/articles?${searchParams.toString()}`), {
    next: { revalidate: PUBLIC_FETCH_REVALIDATE_SECONDS },
  })

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

export async function fetchPublishedArticles(options?: { pageSize?: number; tag?: string }) {
  const response = await fetchPublishedArticlesPage(
    1,
    options?.pageSize || BLOG_POSTS_PER_PAGE,
    options?.tag
  )
  return response.items
}

export async function fetchPublishedArticlesForStaticPaths() {
  return fetchAllPublishedArticles()
}

export async function fetchAllPublishedArticles() {
  const allItems: PublicBlogPost[] = []
  let currentPage = 1
  let totalPages = 1

  while (currentPage <= totalPages) {
    const response = await fetchPublishedArticlesPage(currentPage, PUBLIC_ARTICLE_PRELOAD_SIZE)
    totalPages = response.totalPages
    allItems.push(...response.items)

    if (response.items.length === 0) {
      break
    }
    currentPage += 1
  }

  return allItems
}

export async function fetchPublishedTags() {
  const allArticles = await fetchAllPublishedArticles()
  const tagMap = new Map<string, PublicTag>()

  allArticles.forEach((article) => {
    mergeTagCounts(
      tagMap,
      article.tags.map((tagName) => ({
        tagId: 0,
        name: tagName,
      }))
    )
  })

  return Array.from(tagMap.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count
    }

    return a.name.localeCompare(b.name, 'zh-CN')
  })
}
