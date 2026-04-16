import AdminEditorWorkspace from '@/components/admin/AdminEditorWorkspace'
import { genPageMetadata } from 'app/seo'

import { auth } from '@/auth'
import { adminServerGet } from '@/app/api/admin/_utils'
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

  const payload = await adminServerGet<ApiResult<AdminArticle>>(
    `/api/v1/admin/articles/${numericId}`
  )
  return payload?.data || null
}

async function fetchDraftStats() {
  const payload = await adminServerGet<PageResult<AdminArticle>>(
    '/api/v1/admin/articles?pageIndex=1&pageSize=1&status=draft'
  )
  return {
    draftCount: payload?.totalCount || 0,
    latestDraftId: payload?.data?.[0]?.articleId ? String(payload.data[0].articleId) : undefined,
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
  const draftStats = forceNew && !articleId ? await fetchDraftStats() : { draftCount: 0 }

  return (
    <AdminEditorWorkspace
      article={article}
      articleId={articleId}
      draftHint={forceNew ? draftStats : undefined}
    />
  )
}
