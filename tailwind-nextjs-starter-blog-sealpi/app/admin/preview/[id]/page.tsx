import { notFound } from 'next/navigation'
import Link from '@/components/Link'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import { adminServerGet } from '@/app/api/admin/_utils'
import { estimateReadMinutes } from '@/lib/read-time'

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
  const previewBodyMd = article.draftBodyMd || article.bodyMd

  return (
    <>
      <div className="border-wb-rule-soft bg-wb-canvas mb-6 flex items-center justify-between gap-4 rounded-2xl border px-5 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center gap-2.5">
          <svg
            className="text-wb-accent shrink-0 opacity-70 dark:text-gray-400"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-wb-meta text-xs font-semibold tracking-[0.18em] uppercase dark:text-gray-400">
            草稿预览模式
          </span>
        </div>
        <Link
          href={`/admin/editor?articleId=${id}`}
          className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          返回编辑
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
