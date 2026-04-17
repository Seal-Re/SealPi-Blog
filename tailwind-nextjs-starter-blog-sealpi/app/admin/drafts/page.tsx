import { auth } from '@/auth'
import Link from '@/components/Link'
import Image from 'next/image'
import { adminServerGet } from '@/app/api/admin/_utils'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'
import DraftPublishButton from '@/components/admin/DraftPublishButton'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: '草稿箱',
  description: '管理后台草稿库。',
})

function formatDateLabel(value?: string) {
  if (!value) return '未记录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function DraftCard({ article }: { article: AdminArticle }) {
  return (
    <div className="border-wb-rule-soft bg-wb-canvas group flex flex-col overflow-hidden rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
      <div className="bg-wb-paper relative h-40 w-full shrink-0 overflow-hidden dark:bg-gray-900">
        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt={`${article.title} 封面`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-600">
              无封面
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-wb-meta text-xs dark:text-gray-500">
          {formatDateLabel(article.lastmod || article.date)}
        </p>
        <h3 className="text-wb-ink mt-2 line-clamp-2 text-base font-bold dark:text-gray-50">
          {article.title || '无标题'}
        </h3>
        {article.summary ? (
          <p className="text-wb-meta mt-2 line-clamp-2 flex-1 text-sm leading-6 dark:text-gray-400">
            {article.summary}
          </p>
        ) : (
          <p className="text-wb-meta mt-2 flex-1 text-sm italic dark:text-gray-600">暂无摘要</p>
        )}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/admin/editor?articleId=${article.articleId}`}
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex flex-1 items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:outline-none dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            继续编辑
          </Link>
          <Link
            href={`/admin/preview/${article.articleId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-wb-rule text-wb-meta hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
          >
            预览 ↗
          </Link>
          <DraftPublishButton
            articleId={String(article.articleId)}
            canPublish={Boolean(article.title && article.title !== '未命名草稿' && article.url)}
          />
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 12

function buildDraftsHref(pageIndex: number) {
  if (pageIndex <= 1) return '/admin/drafts'
  return `/admin/drafts?pageIndex=${pageIndex}`
}

export default async function AdminDraftsPage(props: {
  searchParams?: Promise<{ pageIndex?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const pageIndex = Math.max(Number(searchParams?.pageIndex || '1') || 1, 1)

  let drafts: AdminArticle[] = []
  let totalCount = 0
  let totalPages = 1
  let loadError = ''

  const response = await adminServerGet<PageResult<AdminArticle>>(
    `/api/v1/admin/articles?status=draft&pageSize=${PAGE_SIZE}&pageIndex=${pageIndex}`
  )
  if (response === null) {
    loadError = '读取草稿列表失败，请检查登录态后重试。'
  } else {
    drafts = response?.data || []
    totalCount = response?.totalCount || 0
    totalPages = response?.totalPage || Math.max(Math.ceil(totalCount / PAGE_SIZE), 1)
  }

  return (
    <section className="space-y-8">
      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-5 rounded-[2rem] border p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-amber-700 uppercase dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            草稿管理
          </span>
          <h1 className="text-wb-ink text-3xl font-black tracking-tight sm:text-4xl dark:text-white">
            草稿库
          </h1>
          <p className="text-wb-meta max-w-3xl text-sm leading-7 dark:text-gray-300">
            所有已保存的草稿，点击卡片可继续编辑。共 {totalCount} 篇。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回后台首页
          </Link>
          <Link
            href="/admin/editor?mode=new"
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            新建文章
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">草稿列表加载失败</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="border-wb-rule-soft bg-wb-canvas flex flex-col items-center justify-center rounded-[2rem] border py-20 text-center dark:border-gray-800 dark:bg-gray-950">
          <p className="text-wb-meta text-sm font-semibold dark:text-gray-400">暂无草稿</p>
          <p className="text-wb-meta mt-2 text-sm dark:text-gray-500">
            在编辑器中保存草稿后，它将出现在这里。
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((article) => (
              <DraftCard key={article.articleId} article={article} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-3 rounded-[2rem] border p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
              <p className="text-wb-meta text-sm leading-7 dark:text-gray-200">
                共 {totalCount} 篇 · 第 {pageIndex} / {totalPages} 页
              </p>
              <div className="flex gap-3">
                <Link
                  href={buildDraftsHref(pageIndex - 1)}
                  aria-disabled={pageIndex <= 1}
                  tabIndex={pageIndex <= 1 ? -1 : undefined}
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                    pageIndex <= 1
                      ? 'border-wb-rule-soft bg-wb-paper text-wb-meta pointer-events-none border dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                      : 'border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent border focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950'
                  }`}
                >
                  上一页
                </Link>
                <Link
                  href={buildDraftsHref(Math.min(pageIndex + 1, totalPages))}
                  aria-disabled={pageIndex >= totalPages}
                  tabIndex={pageIndex >= totalPages ? -1 : undefined}
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                    pageIndex >= totalPages
                      ? 'border-wb-rule-soft bg-wb-paper text-wb-meta pointer-events-none border dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                      : 'border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent border focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950'
                  }`}
                >
                  下一页
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
