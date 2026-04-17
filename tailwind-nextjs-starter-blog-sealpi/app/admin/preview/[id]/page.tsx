import { notFound } from 'next/navigation'
import Link from '@/components/Link'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import { adminServerGet } from '@/app/api/admin/_utils'

type PreviewPageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

function estimateReadMinutes(markdown?: string | null): number | undefined {
  if (!markdown?.trim()) return undefined
  const cjk = (markdown.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
  const latin = markdown.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ').trim()
  const latinWords = latin ? latin.split(/\s+/).filter(Boolean).length : 0
  return Math.max(1, Math.round(cjk / 300 + latinWords / 220))
}

async function fetchArticleForPreview(id: string): Promise<AdminArticle | null> {
  const result = await adminServerGet<ApiResult<AdminArticle>>(`/api/v1/admin/articles/${id}`)
  return result?.data || null
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params
  const article = await fetchArticleForPreview(id)
  if (!article) return notFound()

  const dateIso = article.date ? new Date(article.date).toISOString() : new Date().toISOString()
  const previewBodyMd = article.draftBodyMd || article.bodyMd

  return (
    <>
      <div className="border-wb-rule-soft bg-wb-canvas mb-4 flex items-center justify-between rounded-2xl border px-5 py-3 text-sm dark:border-gray-800 dark:bg-gray-950">
        <span className="text-wb-meta dark:text-gray-400">草稿预览模式</span>
        <Link
          href={`/admin/editor?articleId=${id}`}
          className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
        >
          ← 返回编辑
        </Link>
      </div>
      <WorkbookArticleLayout
        title={article.title || '（无标题草稿）'}
        dateIso={dateIso}
        tags={article.tags?.map((t) => t.name).filter((n): n is string => Boolean(n)) || []}
        readMinutes={estimateReadMinutes(previewBodyMd)}
        contentJson={article.draftJson || article.contentJson}
        coverImageUrl={article.coverImageUrl}
        coverCaption={article.coverCaption}
        bodyMd={previewBodyMd}
        eyebrow="草稿预览"
        eyebrowHref="/admin/drafts"
      />
    </>
  )
}
