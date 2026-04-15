import AdminEditorWorkspace from '@/components/admin/AdminEditorWorkspace'
import { genPageMetadata } from 'app/seo'

import { auth } from '@/auth'
import { adminFetch } from '@/lib/admin-api'
import type { AdminArticle, ApiResult, PageResult } from '@/lib/blog-api-types'

export const metadata = genPageMetadata({
  title: '文章编辑器',
  description: '管理后台文章编辑入口。',
})

async function fetchArticleDetail(articleId: string) {
  const numericId = Number(articleId)
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const response = await adminFetch<ApiResult<AdminArticle>>(`/api/v1/articles/${numericId}`)
  return response?.data || null
}

async function fetchDraftStats() {
  const response = await adminFetch<PageResult<AdminArticle>>(
    '/api/v1/articles?pageIndex=1&pageSize=1&status=draft'
  )
  return {
    draftCount: response?.totalCount || 0,
    latestDraftId: response?.data?.[0]?.articleId ? String(response.data[0].articleId) : undefined,
  }
}

export default async function AdminEditorPage(props: {
  searchParams?: Promise<{ articleId?: string; mode?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const articleId = searchParams?.articleId
  const forceNew = searchParams?.mode === 'new'
  const article = articleId ? await fetchArticleDetail(articleId) : null
  const resolvedArticleId = articleId || article?.articleId
  const draftStats = forceNew && !articleId ? await fetchDraftStats() : { draftCount: 0 }

  return (
    <AdminEditorWorkspace
      article={article}
      articleId={resolvedArticleId}
      draftHint={forceNew ? draftStats : undefined}
    />
  )
}
