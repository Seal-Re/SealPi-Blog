import { auth } from '@/auth'
import Link from '@/components/Link'
import Image from 'next/image'
import { adminServerGet } from '@/app/api/admin/_utils'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'
import DraftPublishButton from '@/components/admin/DraftPublishButton'
import DraftDeleteButton from '@/components/admin/DraftDeleteButton'
import { getPageSequence } from '@/lib/pagination-utils'
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
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <svg
              className="text-wb-rule/60 dark:text-gray-700"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-wb-meta/60 text-[10px] font-semibold tracking-[0.2em] uppercase dark:text-gray-700">
              无封面
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-wb-meta text-xs tabular-nums dark:text-gray-500">
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
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex flex-1 items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            继续编辑
          </Link>
          <Link
            href={`/admin/preview/${article.articleId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-wb-rule text-wb-meta hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
          >
            预览
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
          <DraftPublishButton
            articleId={String(article.articleId)}
            canPublish={Boolean(article.title && article.title !== '未命名草稿' && article.url)}
          />
          <DraftDeleteButton articleId={String(article.articleId)} />
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 12

function buildDraftsHref(pageIndex: number, q?: string) {
  const params = new URLSearchParams({ pageIndex: String(Math.max(pageIndex, 1)) })
  if (q?.trim()) params.set('q', q.trim())
  return `/admin/drafts?${params.toString()}`
}

export default async function AdminDraftsPage(props: {
  searchParams?: Promise<{ pageIndex?: string; q?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const pageIndex = Math.max(Number(searchParams?.pageIndex || '1') || 1, 1)
  const q = searchParams?.q?.trim() || ''

  let drafts: AdminArticle[] = []
  let totalCount = 0
  let totalPages = 1
  let loadError = ''

  const apiParams = new URLSearchParams({
    status: 'draft',
    pageSize: String(PAGE_SIZE),
    pageIndex: String(pageIndex),
  })
  if (q) apiParams.set('q', q)
  const response = await adminServerGet<PageResult<AdminArticle>>(
    `/api/v1/admin/articles?${apiParams.toString()}`
  )
  if (response === null) {
    loadError = '读取草稿列表失败，请检查登录态后重试。'
  } else {
    drafts = response?.data || []
    totalCount = response?.totalCount || 0
    totalPages = response?.totalPage || Math.max(Math.ceil(totalCount / PAGE_SIZE), 1)
  }

  return (
    <section className="wb-page-enter space-y-8">
      <div className="border-wb-rule-soft bg-wb-canvas relative flex flex-col gap-5 overflow-hidden rounded-[2rem] border p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.09),transparent_55%),radial-gradient(circle_at_top_right,rgba(201,181,151,0.07),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.08),transparent_55%),radial-gradient(circle_at_top_right,rgba(166,88,43,0.04),transparent_40%)]" />
        <div className="relative space-y-3">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-amber-700 uppercase dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            草稿管理
          </span>
          <h1 className="text-wb-ink text-3xl font-black tracking-tight sm:text-4xl dark:text-white">
            草稿库
          </h1>
          <p className="text-wb-meta max-w-3xl text-sm leading-7 dark:text-gray-300">
            所有已保存的草稿，点击卡片可继续编辑。共 {totalCount} 篇{q ? `（关键词「${q}」）` : ''}
            。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回后台首页
          </Link>
          <Link
            href="/admin/editor?mode=new"
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            新建文章
          </Link>
        </div>
      </div>

      <form
        action="/admin/drafts"
        method="get"
        className="border-wb-rule-soft bg-wb-canvas flex items-center gap-3 rounded-2xl border p-3 dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="relative flex-1">
          <svg
            className="text-wb-meta/70 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 dark:text-gray-500"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索草稿标题 / slug"
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta focus:border-wb-accent focus:ring-wb-accent/10 w-full rounded-full border py-2 pr-3 pl-8 text-sm transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          className="border-wb-rule bg-wb-canvas text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          搜索
        </button>
        {q ? (
          <a
            href="/admin/drafts"
            className="border-wb-rule-soft text-wb-meta hover:border-wb-ink hover:text-wb-ink focus-visible:ring-wb-accent shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:text-gray-200"
          >
            清空
          </a>
        ) : null}
      </form>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">草稿列表加载失败</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="border-wb-rule-soft bg-wb-canvas flex flex-col items-center justify-center rounded-[2rem] border py-20 text-center dark:border-gray-800 dark:bg-gray-950">
          <svg
            className="text-wb-rule dark:text-gray-700"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {q ? (
              <>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </>
            ) : (
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            )}
          </svg>
          <p className="text-wb-meta mt-4 text-sm font-semibold dark:text-gray-400">
            {q ? '未找到符合条件的草稿' : '暂无草稿'}
          </p>
          <p className="text-wb-meta mt-2 text-sm dark:text-gray-500">
            {q ? '尝试修改搜索词后重试。' : '在编辑器中保存草稿后，它将出现在这里。'}
          </p>
          <Link
            href="/admin/editor?mode=new"
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            创建第一篇文章
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((article) => (
              <DraftCard key={article.articleId} article={article} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-4 rounded-[2rem] border p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
              <p className="text-wb-meta text-sm leading-7 tabular-nums dark:text-gray-200">
                共 {totalCount} 篇 · 第 {pageIndex} / {totalPages} 页
              </p>
              {totalPages > 1 && (
                <nav className="flex flex-wrap items-center gap-1" aria-label="分页导航">
                  {pageIndex > 1 ? (
                    <Link
                      href={buildDraftsHref(pageIndex - 1, q)}
                      rel="prev"
                      aria-label="上一页"
                      className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400"
                    >
                      <span aria-hidden="true">←</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="border-wb-rule-soft text-wb-rule inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border opacity-35 select-none dark:border-gray-800 dark:text-gray-600"
                    >
                      <span aria-hidden="true">←</span>
                    </span>
                  )}

                  {getPageSequence(pageIndex, totalPages).map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="text-wb-rule px-1 text-sm select-none dark:text-gray-600"
                      >
                        …
                      </span>
                    ) : item === pageIndex ? (
                      <span
                        key={item}
                        aria-current="page"
                        className="bg-wb-accent text-wb-paper inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
                      >
                        {item}
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={buildDraftsHref(item, q)}
                        aria-label={`第 ${item} 页`}
                        className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm tabular-nums transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400"
                      >
                        {item}
                      </Link>
                    )
                  )}

                  {pageIndex < totalPages ? (
                    <Link
                      href={buildDraftsHref(pageIndex + 1, q)}
                      rel="next"
                      aria-label="下一页"
                      className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400"
                    >
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="border-wb-rule-soft text-wb-rule inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border opacity-35 select-none dark:border-gray-800 dark:text-gray-600"
                    >
                      <span aria-hidden="true">→</span>
                    </span>
                  )}
                </nav>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
