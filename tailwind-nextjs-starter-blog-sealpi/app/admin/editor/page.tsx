import AdminEditorWorkspace from '@/components/admin/AdminEditorWorkspace'
import { genPageMetadata } from 'app/seo'

import { auth } from '@/auth'
import { adminFetch } from '@/lib/admin-api'
import type { AdminArticle, ApiResult, PageResult } from '@/lib/blog-api-types'

export const metadata = genPageMetadata({
  title: 'Admin Editor',
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

async function fetchLatestDraftArticle() {
  const response = await adminFetch<PageResult<AdminArticle>>(
    '/api/v1/articles?pageIndex=1&pageSize=1&status=draft'
  )
  return response?.data?.[0] || null
}

export default async function AdminEditorPage(props: {
  searchParams?: Promise<{ articleId?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const articleId = searchParams?.articleId
  const article = articleId ? await fetchArticleDetail(articleId) : await fetchLatestDraftArticle()
  const resolvedArticleId = articleId || article?.articleId

  return <AdminEditorWorkspace article={article} articleId={resolvedArticleId} />
}
