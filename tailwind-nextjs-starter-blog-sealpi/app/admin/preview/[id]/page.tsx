import { notFound } from 'next/navigation'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import { adminServerGet } from '@/app/api/admin/_utils'

type PreviewPageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

async function fetchArticleForPreview(id: string): Promise<AdminArticle | null> {
  const result = await adminServerGet<ApiResult<AdminArticle>>(`/api/v1/admin/articles/${id}`)
  return result?.data || null
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params
  const article = await fetchArticleForPreview(id)
  if (!article) return notFound()

  const dateIso = article.date ? new Date(article.date).toISOString() : new Date().toISOString()

  return (
    <WorkbookArticleLayout
      title={article.title || '（无标题草稿）'}
      dateIso={dateIso}
      tags={article.tags?.map((t) => t.name).filter((n): n is string => Boolean(n)) || []}
      contentJson={article.draftJson || article.contentJson}
      coverImageUrl={article.coverImageUrl}
      coverCaption={article.coverCaption}
      bodyMd={article.draftBodyMd || article.bodyMd}
      eyebrow="草稿预览"
      eyebrowHref="/admin/drafts"
    />
  )
}
