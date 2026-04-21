import { auth } from '@/auth'
import Link from '@/components/Link'
import AdminArticleRowActions from '@/components/admin/AdminArticleRowActions'
import AdminErrorToast from '@/components/admin/AdminErrorToast'
import AdminArticlesTopbarPortal from '@/components/admin/AdminArticlesTopbarPortal'
import { adminServerGet } from '@/app/api/admin/_utils'
import { isDraftStatus, isArchivedStatus, isPublishedStatus } from '@/lib/article-status'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'
import { getPageSequence } from '@/lib/pagination-utils'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: '文章列表',
  description: '管理后台文章列表与编辑入口。',
})

function formatDateLabel(value?: string) {
  if (!value) {
    return '未记录'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function DraftBadge({ draft }: { draft?: number }) {
  const isArchived = isArchivedStatus(draft)
  const isDraft = isDraftStatus(draft)

  if (isArchived) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase dark:border-amber-500/40 dark:text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        已归档
      </span>
    )
  }
  if (!isDraft) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:border-emerald-500/40 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        已发布
      </span>
    )
  }
  return (
    <span className="border-wb-rule-soft text-wb-meta inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase dark:border-gray-700 dark:text-gray-400">
      <span className="bg-wb-rule h-2 w-2 rounded-full dark:bg-gray-500" />
      草稿中
    </span>
  )
}

function ArticleCard({ article }: { article: AdminArticle }) {
  const isPublished = isPublishedStatus(article.draft)
  const isArchived = isArchivedStatus(article.draft)
  const accentBarClass = isArchived
    ? 'bg-amber-400/50 dark:bg-amber-500/30'
    : isPublished
      ? 'bg-emerald-400/50 dark:bg-emerald-500/30'
      : 'bg-wb-rule/60 dark:bg-gray-600/40'

  return (
    <div className="border-wb-rule-soft/70 hover:bg-wb-paper/60 relative border-b px-5 py-4 transition-all duration-300 last:border-b-0 dark:border-gray-800/70 dark:hover:bg-gray-900/40">
      <span
        className={`absolute inset-y-4 left-0 w-0.5 rounded-full ${accentBarClass}`}
        aria-hidden="true"
      />
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/admin/editor?articleId=${article.articleId}`}
            className="text-wb-ink hover:text-wb-accent focus-visible:ring-wb-accent min-w-0 flex-1 rounded text-sm leading-snug font-semibold transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none dark:text-gray-50"
          >
            {article.title}
          </Link>
          <DraftBadge draft={article.draft} />
        </div>
        {article.tags && article.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <span
                key={tag.tagId}
                className="border-wb-rule-soft text-wb-meta rounded border px-2 py-0.5 font-mono text-[10px] dark:border-gray-700 dark:text-gray-500"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}
        <div className="text-wb-meta flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums dark:text-gray-400">
          <span>ID {article.articleId}</span>
          <span className="font-geist-mono max-w-[160px] truncate">{article.url}</span>
          <span>{(article.viewCount ?? article.count ?? 0).toLocaleString('zh-CN')} 次浏览</span>
        </div>
        <div className="text-wb-meta text-xs tabular-nums dark:text-gray-500">
          {formatDateLabel(article.date)}
        </div>
        <AdminArticleRowActions
          articleId={String(article.articleId)}
          articleUrl={article.url}
          draft={article.draft}
        />
      </div>
    </div>
  )
}

function ArticleRow({ article }: { article: AdminArticle }) {
  const isPublished = isPublishedStatus(article.draft)
  const isArchived = isArchivedStatus(article.draft)
  const accentBarClass = isArchived
    ? 'bg-amber-400/50 dark:bg-amber-500/30'
    : isPublished
      ? 'bg-emerald-400/50 dark:bg-emerald-500/30'
      : 'bg-wb-rule/60 dark:bg-gray-600/40'

  return (
    <tr className="border-wb-rule-soft/80 hover:bg-wb-paper/70 group border-t align-top transition-all duration-300 dark:border-gray-800/80 dark:hover:bg-gray-900/40">
      <td className="relative px-4 py-5">
        <span
          className={`absolute inset-y-2 left-0 w-0.5 rounded-full ${accentBarClass}`}
          aria-hidden="true"
        />
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="border-wb-rule-soft bg-wb-paper mt-0.5 hidden shrink-0 overflow-hidden rounded-lg border sm:block dark:border-gray-700 dark:bg-gray-900">
            {article.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.coverImageUrl}
                alt=""
                className="h-14 w-20 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-14 w-20 items-center justify-center">
                <svg
                  className="text-wb-rule/60 dark:text-gray-700"
                  width="20"
                  height="20"
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
              </div>
            )}
          </div>
          {/* Text content */}
          <div className="min-w-0 space-y-2">
            <Link
              href={`/admin/editor?articleId=${article.articleId}`}
              className="text-wb-ink hover:text-wb-accent focus-visible:ring-wb-accent dark:hover:text-wb-accent rounded text-base font-semibold transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none dark:text-gray-50"
            >
              {article.title}
            </Link>
            <div className="text-wb-meta flex flex-wrap gap-2 text-xs tabular-nums dark:text-gray-400">
              <span>ID: {article.articleId}</span>
              <span>Slug: {article.url}</span>
            </div>
            {article.tags && article.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <span
                    key={tag.tagId}
                    className="border-wb-rule-soft text-wb-meta rounded border px-2 py-0.5 font-mono text-[10px] dark:border-gray-700 dark:text-gray-500"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-5">
        <p className="text-wb-meta max-w-md text-sm leading-7 dark:text-gray-300">
          {article.summary || '暂无摘要'}
        </p>
      </td>
      <td className="px-4 py-5">
        <DraftBadge draft={article.draft} />
      </td>
      <td className="text-wb-meta px-4 py-5 text-sm tabular-nums dark:text-gray-300">
        <div>创建: {formatDateLabel(article.date)}</div>
        <div className="mt-2">更新: {formatDateLabel(article.lastmod)}</div>
      </td>
      <td className="text-wb-meta px-4 py-5 text-sm tabular-nums dark:text-gray-300">
        <div>浏览量: {(article.viewCount ?? article.count ?? 0).toLocaleString('zh-CN')}</div>
      </td>
      <td className="px-4 py-5">
        <div>
          <AdminArticleRowActions
            articleId={String(article.articleId)}
            articleUrl={article.url}
            draft={article.draft}
          />
        </div>
      </td>
    </tr>
  )
}

async function fetchArticles(
  pageIndex: number,
  q?: string,
  status?: string,
  tag?: string,
  sort?: string
) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: '10',
  })
  if (q) {
    params.set('q', q)
  }
  if (status && status !== 'all') {
    params.set('status', status)
  }
  if (tag) {
    params.set('tag', tag)
  }
  if (sort && sort !== 'date') {
    params.set('sort', sort)
  }

  return adminServerGet<PageResult<AdminArticle>>(`/api/v1/admin/articles?${params.toString()}`)
}

function buildAdminArticlesPageHref(
  pageIndex: number,
  q?: string,
  status?: string,
  tag?: string,
  sort?: string
) {
  const params = new URLSearchParams({
    pageIndex: String(Math.max(pageIndex, 1)),
  })
  if (q?.trim()) {
    params.set('q', q.trim())
  }
  if (status && status !== 'all') {
    params.set('status', status)
  }
  if (tag?.trim()) {
    params.set('tag', tag.trim())
  }
  if (sort && sort !== 'date') {
    params.set('sort', sort)
  }
  return `/admin/articles?${params.toString()}`
}

export default async function AdminArticlesPage(props: {
  searchParams?: Promise<{
    pageIndex?: string
    q?: string
    status?: string
    tag?: string
    sort?: string
  }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const pageIndex = Math.max(Number(searchParams?.pageIndex || '1') || 1, 1)
  const q = searchParams?.q?.trim() || ''
  const status = searchParams?.status || 'all'
  const tag = searchParams?.tag?.trim() || ''
  const sort = searchParams?.sort?.trim() || ''
  const hasFilter = Boolean(q || (status && status !== 'all') || tag || (sort && sort !== 'date'))
  let articles: AdminArticle[] = []
  let pageSize = 10
  let totalCount = 0
  let totalPages = 1
  let loadError = ''

  try {
    const response = await fetchArticles(pageIndex, q, status, tag, sort)
    if (response === null) {
      loadError = '读取文章列表失败，请检查登录态后重试。'
    } else {
      articles = response?.data || []
      pageSize = response?.pageSize || 10
      totalCount = response?.totalCount || 0
      totalPages = Math.max(Math.ceil(totalCount / pageSize), 1)
    }
  } catch {
    loadError = '读取文章列表失败，请稍后重试。'
  }

  return (
    <section className="wb-page-enter space-y-8">
      <AdminArticlesTopbarPortal q={q} status={status} tag={tag} sort={sort} />
      <AdminErrorToast message={loadError} />
      <div className="border-wb-rule-soft bg-wb-canvas relative flex flex-col gap-5 overflow-hidden rounded-[2rem] border p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.09),transparent_55%),radial-gradient(circle_at_top_right,rgba(201,181,151,0.07),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.08),transparent_55%),radial-gradient(circle_at_top_right,rgba(166,88,43,0.04),transparent_40%)]" />
        <div className="relative space-y-3">
          <span className="border-wb-rule bg-wb-paper text-wb-accent inline-flex rounded-full border px-4 py-1 text-xs font-semibold tracking-[0.24em] uppercase dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            文章管理
          </span>
          <h1 className="text-wb-ink text-3xl font-black tracking-tight sm:text-4xl dark:text-white">
            文章列表
          </h1>
          <p className="text-wb-meta max-w-3xl text-sm leading-7 dark:text-gray-300">
            管理所有文章，进行创建、编辑、发布与删除。
            {hasFilter && (
              <span className="text-wb-accent ml-2 dark:text-gray-400">
                （已筛选：
                {[
                  status && status !== 'all'
                    ? ({ draft: '草稿', published: '已发布', archived: '已归档' }[status] ?? status)
                    : null,
                  q ? `关键词「${q}」` : null,
                  tag ? `标签「${tag}」` : null,
                  sort === 'lastmod' ? `排序：最近更新` : sort === 'views' ? `排序：浏览量` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                ）
                <a
                  href="/admin/articles"
                  className="text-wb-meta hover:text-wb-ink ml-1 underline underline-offset-2 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  清空
                </a>
              </span>
            )}
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

      {/* Mobile inline filter — hidden on sm+ where the topbar filter takes over */}
      <form
        action="/admin/articles"
        method="get"
        className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-3 rounded-2xl border p-4 sm:hidden dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="relative">
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
            placeholder="搜索标题 / slug"
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta focus:border-wb-accent focus:ring-wb-accent/10 w-full rounded-full border py-2 pr-3 pl-8 text-sm transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-2">
          <input
            name="tag"
            defaultValue={tag}
            placeholder="标签"
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta focus:border-wb-accent focus:ring-wb-accent/10 min-w-0 flex-1 rounded-full border px-3 py-2 text-sm transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <select
            name="status"
            defaultValue={status}
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink focus:border-wb-accent focus:ring-wb-accent/10 rounded-full border px-3 py-2 text-sm transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="all">全部</option>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
            <option value="archived">归档</option>
          </select>
          <select
            name="sort"
            defaultValue={sort || 'date'}
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink focus:border-wb-accent focus:ring-wb-accent/10 rounded-full border px-3 py-2 text-sm transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="date">按创建时间</option>
            <option value="lastmod">按更新时间</option>
            <option value="views">按浏览量</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            筛选
          </button>
          {hasFilter && (
            <a
              href="/admin/articles"
              className="border-wb-rule text-wb-meta hover:border-wb-ink hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:text-gray-200"
            >
              清空
            </a>
          )}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            {hasFilter ? '筛选结果数' : '文章总数'}
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black tabular-nums dark:text-gray-50">
            {totalCount}
          </p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            当前页码
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black tabular-nums dark:text-gray-50">
            {pageIndex}
          </p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            总页数
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black tabular-nums dark:text-gray-50">
            {totalPages}
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">文章列表接口调用失败</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}

      {/* Mobile card list — shown below md */}
      <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-[2rem] border md:hidden dark:border-gray-800 dark:bg-gray-950">
        {articles.length > 0 ? (
          articles.map((article) => <ArticleCard key={article.articleId} article={article} />)
        ) : (
          <div className="px-5 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="text-wb-rule dark:text-gray-700"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {hasFilter ? (
                  <>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </>
                ) : (
                  <>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </>
                )}
              </svg>
              <p className="text-wb-meta text-sm font-semibold dark:text-gray-400">
                {hasFilter ? '未找到符合条件的文章' : '暂无文章'}
              </p>
              <p className="text-wb-meta max-w-xs text-xs leading-6 dark:text-gray-500">
                {hasFilter
                  ? '尝试修改筛选条件，或清空所有筛选后重试。'
                  : '点击右上角"新建文章"开始创作，保存草稿后文章将出现在这里。'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table — shown from md up */}
      <div className="border-wb-rule-soft bg-wb-canvas hidden overflow-hidden rounded-[2rem] border md:block dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-wb-paper/80 dark:bg-gray-950/60">
              <tr>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  标题
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  摘要
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  状态
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  时间
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  统计
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {articles.length > 0 ? (
                articles.map((article) => <ArticleRow key={article.articleId} article={article} />)
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="text-wb-rule dark:text-gray-700"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {hasFilter ? (
                          <>
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                          </>
                        ) : (
                          <>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </>
                        )}
                      </svg>
                      <p className="text-wb-meta text-sm font-semibold dark:text-gray-400">
                        {hasFilter ? '未找到符合条件的文章' : '暂无文章'}
                      </p>
                      <p className="text-wb-meta max-w-xs text-xs leading-6 dark:text-gray-500">
                        {hasFilter
                          ? '尝试修改筛选条件，或清空所有筛选后重试。'
                          : '点击右上角"新建文章"开始创作，保存草稿后文章将出现在这里。'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-4 rounded-[2rem] border p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
        <p className="text-wb-meta text-sm leading-7 tabular-nums dark:text-gray-200">
          共 {totalCount} 篇 · 第 {pageIndex} / {totalPages} 页
        </p>
        {totalPages > 1 && (
          <nav className="flex flex-wrap items-center gap-1" aria-label="分页导航">
            {/* Prev */}
            {pageIndex > 1 ? (
              <Link
                href={buildAdminArticlesPageHref(pageIndex - 1, q, status, tag, sort)}
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

            {/* Page numbers */}
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
                  href={buildAdminArticlesPageHref(item, q, status, tag, sort)}
                  aria-label={`第 ${item} 页`}
                  className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm tabular-nums transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400"
                >
                  {item}
                </Link>
              )
            )}

            {/* Next */}
            {pageIndex < totalPages ? (
              <Link
                href={buildAdminArticlesPageHref(pageIndex + 1, q, status, tag, sort)}
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
    </section>
  )
}
