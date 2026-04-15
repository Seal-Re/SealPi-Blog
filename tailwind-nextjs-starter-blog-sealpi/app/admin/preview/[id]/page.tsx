import { notFound } from 'next/navigation'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import { proxyAdminRequest } from '@/app/api/admin/_utils'

type PreviewPageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

async function fetchArticleForPreview(id: string): Promise<AdminArticle | null> {
  const response = await proxyAdminRequest(`/api/v1/articles/${id}`, 'GET')
  if (!response || !response.ok) return null
  const payload = (await response.json()) as ApiResult<AdminArticle>
  return payload.data || null
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params
  const article = await fetchArticleForPreview(id)
  if (!article) return notFound()

  return (
    <WorkbookArticleLayout
      title={article.title || '（无标题草稿）'}
      date={new Date(article.date || Date.now()).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
      tags={article.tags?.map((t) => t.name).filter((n): n is string => Boolean(n)) || []}
      contentJson={article.draftJson || article.contentJson}
      coverImageUrl={article.coverImageUrl}
      coverCaption={article.coverCaption}
      bodyMd={article.draftBodyMd || article.bodyMd}
      eyebrow="Draft preview"
    />
  )
}
