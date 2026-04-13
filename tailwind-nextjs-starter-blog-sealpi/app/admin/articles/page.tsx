import { auth } from '@/auth'
import Link from '@/components/Link'
import AdminArticleRowActions from '@/components/admin/AdminArticleRowActions'
import AdminErrorToast from '@/components/admin/AdminErrorToast'
import AdminArticlesTopbarPortal from '@/components/admin/AdminArticlesTopbarPortal'
import PageTitle from '@/components/PageTitle'
import { AdminApiError, adminFetch } from '@/lib/admin-api'
import { isDraftStatus, isPublishedStatus } from '@/lib/article-status'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Admin Articles',
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
  const isDraft = isDraftStatus(draft)

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase dark:border-gray-700">
      <span
        className={`h-2 w-2 rounded-full ${isDraft ? 'bg-gray-400 dark:bg-gray-500' : 'bg-emerald-500'}`}
      />
      {isDraft ? '草稿中' : '已发布'}
    </span>
  )
}

function ArticleRow({ article }: { article: AdminArticle }) {
  return (
    <tr className="group border-t border-gray-200/80 align-top transition-all duration-300 hover:bg-gray-50/70 dark:border-gray-800/80 dark:hover:bg-gray-900/40">
      <td className="px-4 py-5">
        <div className="space-y-2">
          <Link
            href={`/admin/editor?articleId=${article.articleId}`}
            className="text-base font-semibold text-gray-950 hover:text-sky-700 dark:text-gray-50 dark:hover:text-sky-300"
          >
            {article.title}
          </Link>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>ID: {article.articleId}</span>
            <span>Slug: {article.url}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-5">
        <p className="max-w-md text-sm leading-7 text-gray-600 dark:text-gray-300">
          {article.summary || '暂无摘要'}
        </p>
      </td>
      <td className="px-4 py-5">
        <DraftBadge draft={article.draft} />
      </td>
      <td className="px-4 py-5 text-sm text-gray-600 dark:text-gray-300">
        <div>创建: {formatDateLabel(article.date)}</div>
        <div className="mt-2">更新: {formatDateLabel(article.lastmod)}</div>
      </td>
      <td className="px-4 py-5 text-sm text-gray-600 dark:text-gray-300">
        <div>浏览量: {article.viewCount ?? article.count ?? 0}</div>
        <div className="mt-2">封面: {article.coverImageUrl ? '已配置' : '未配置'}</div>
      </td>
      <td className="px-4 py-5">
        <div className="opacity-100 transition-all duration-300 group-hover:opacity-100">
          <AdminArticleRowActions
            articleId={String(article.articleId)}
            articleUrl={article.url}
            isPublished={isPublishedStatus(article.draft)}
          />
        </div>
      </td>
    </tr>
  )
}

async function fetchArticles(pageIndex: number, q?: string, status?: string) {
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

  return adminFetch<PageResult<AdminArticle>>(`/api/v1/articles?${params.toString()}`)
}

function buildAdminArticlesPageHref(pageIndex: number, q?: string, status?: string) {
  const params = new URLSearchParams({
    pageIndex: String(Math.max(pageIndex, 1)),
  })
  if (q?.trim()) {
    params.set('q', q.trim())
  }
  if (status && status !== 'all') {
    params.set('status', status)
  }
  return `/admin/articles?${params.toString()}`
}

export default async function AdminArticlesPage(props: {
  searchParams?: Promise<{ pageIndex?: string; q?: string; status?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const pageIndex = Math.max(Number(searchParams?.pageIndex || '1') || 1, 1)
  const q = searchParams?.q?.trim() || ''
  const status = searchParams?.status || 'all'
  let articles: AdminArticle[] = []
  let pageSize = 10
  let totalCount = 0
  let totalPages = 1
  let loadError = ''

  try {
    const response = await fetchArticles(pageIndex, q, status)
    articles = response?.data || []
    pageSize = response?.pageSize || 10
    totalCount = response?.totalCount || 0
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1)
  } catch (error) {
    if (error instanceof AdminApiError) {
      loadError = `${error.message} (HTTP ${error.status})`
    } else {
      loadError = '读取文章列表失败，请稍后重试。'
    }
  }

  return (
    <section className="space-y-8">
      <AdminArticlesTopbarPortal q={q} status={status} />
      <AdminErrorToast message={loadError} />
      <div className="flex flex-col gap-5 rounded-[2rem] border border-gray-200 bg-white p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-sky-700 uppercase dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            Admin Articles
          </span>
          <PageTitle>文章列表</PageTitle>
          <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            管理所有文章，进行创建、编辑、发布与删除。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回后台首页
          </Link>
          <Link
            href="/admin/editor?mode=new"
            className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            新建文章
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
            文章总数
          </p>
          <p className="mt-3 text-3xl font-black text-gray-950 dark:text-gray-50">{totalCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
            当前页码
          </p>
          <p className="mt-3 text-3xl font-black text-gray-950 dark:text-gray-50">{pageIndex}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
            分页规模
          </p>
          <p className="mt-3 text-3xl font-black text-gray-950 dark:text-gray-50">{pageSize}</p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">文章列表接口调用失败</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-gray-50/80 dark:bg-gray-950/60">
              <tr>
                <th className="px-4 py-4 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                  标题
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                  摘要
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                  状态
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                  时间
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                  统计
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
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
                    className="px-4 py-14 text-center text-sm leading-7 text-gray-500 dark:text-gray-400"
                  >
                    当前没有文章数据。可点击“新建文章”创建，或通过筛选查看草稿与已发布内容。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
        <p className="text-sm leading-7 text-gray-700 dark:text-gray-200">
          共 {totalCount} 篇 · 第 {pageIndex} / {totalPages} 页
        </p>
        <div className="flex gap-3">
          <Link
            href={buildAdminArticlesPageHref(pageIndex - 1, q, status)}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              pageIndex <= 1
                ? 'pointer-events-none border border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                : 'border border-gray-300 text-gray-900 hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950'
            }`}
          >
            上一页
          </Link>
          <Link
            href={buildAdminArticlesPageHref(Math.min(pageIndex + 1, totalPages), q, status)}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              pageIndex >= totalPages
                ? 'pointer-events-none border border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                : 'border border-gray-300 text-gray-900 hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950'
            }`}
          >
            下一页
          </Link>
        </div>
      </div>
    </section>
  )
}
