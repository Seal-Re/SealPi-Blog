import { auth } from '@/auth'
import Link from '@/components/Link'
import AdminArticleRowActions from '@/components/admin/AdminArticleRowActions'
import AdminErrorToast from '@/components/admin/AdminErrorToast'
import AdminArticlesTopbarPortal from '@/components/admin/AdminArticlesTopbarPortal'
import { adminServerGet } from '@/app/api/admin/_utils'
import { isDraftStatus, isArchivedStatus } from '@/lib/article-status'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'
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

  const dotClass = isArchived
    ? 'bg-amber-500'
    : isDraft
      ? 'bg-gray-400 dark:bg-gray-500'
      : 'bg-emerald-500'
  const label = isArchived ? '已归档' : isDraft ? '草稿中' : '已发布'

  return (
    <span className="border-wb-rule-soft inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase dark:border-gray-700">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}

function ArticleRow({ article }: { article: AdminArticle }) {
  return (
    <tr className="border-wb-rule-soft/80 hover:bg-wb-paper/70 group border-t align-top transition-all duration-300 dark:border-gray-800/80 dark:hover:bg-gray-900/40">
      <td className="px-4 py-5">
        <div className="space-y-2">
          <Link
            href={`/admin/editor?articleId=${article.articleId}`}
            className="text-wb-ink hover:text-wb-accent dark:hover:text-wb-accent text-base font-semibold transition-colors duration-200 dark:text-gray-50"
          >
            {article.title}
          </Link>
          <div className="text-wb-meta flex flex-wrap gap-2 text-xs dark:text-gray-400">
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
      </td>
      <td className="px-4 py-5">
        <p className="text-wb-meta max-w-md text-sm leading-7 dark:text-gray-300">
          {article.summary || '暂无摘要'}
        </p>
      </td>
      <td className="px-4 py-5">
        <DraftBadge draft={article.draft} />
      </td>
      <td className="text-wb-meta px-4 py-5 text-sm dark:text-gray-300">
        <div>创建: {formatDateLabel(article.date)}</div>
        <div className="mt-2">更新: {formatDateLabel(article.lastmod)}</div>
      </td>
      <td className="text-wb-meta px-4 py-5 text-sm dark:text-gray-300">
        <div>浏览量: {article.viewCount ?? article.count ?? 0}</div>
        <div className="mt-2">封面: {article.coverImageUrl ? '已配置' : '未配置'}</div>
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
    <section className="space-y-8">
      <AdminArticlesTopbarPortal q={q} status={status} tag={tag} sort={sort} />
      <AdminErrorToast message={loadError} />
      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-5 rounded-[2rem] border p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
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
                  sort && sort !== 'date' ? `排序：最近更新` : null,
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            {hasFilter ? '筛选结果数' : '文章总数'}
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black dark:text-gray-50">{totalCount}</p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            当前页码
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black dark:text-gray-50">{pageIndex}</p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            总页数
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black dark:text-gray-50">{totalPages}</p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">文章列表接口调用失败</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}

      <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-[2rem] border dark:border-gray-800 dark:bg-gray-950">
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
                  <td
                    colSpan={6}
                    className="text-wb-meta px-4 py-14 text-center text-sm leading-7 dark:text-gray-400"
                  >
                    {hasFilter
                      ? '未找到符合条件的文章。'
                      : '当前没有文章数据。可点击"新建文章"创建，或通过筛选查看草稿与已发布内容。'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-3 rounded-[2rem] border p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
        <p className="text-wb-meta text-sm leading-7 dark:text-gray-200">
          共 {totalCount} 篇 · 第 {pageIndex} / {totalPages} 页
        </p>
        <div className="flex gap-3">
          <Link
            href={buildAdminArticlesPageHref(pageIndex - 1, q, status, tag, sort)}
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
            href={buildAdminArticlesPageHref(
              Math.min(pageIndex + 1, totalPages),
              q,
              status,
              tag,
              sort
            )}
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
    </section>
  )
}
