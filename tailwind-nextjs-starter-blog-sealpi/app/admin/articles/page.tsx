import { auth } from '@/auth'
import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import { adminFetch } from '@/lib/admin-api'
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
  const isDraft = draft === 1

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase ${
        isDraft
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
      }`}
    >
      {isDraft ? '草稿中' : '已发布'}
    </span>
  )
}

function ArticleRow({ article }: { article: AdminArticle }) {
  return (
    <tr className="border-t border-gray-200/80 align-top dark:border-gray-800/80">
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
          {article.summary || '暂无摘要，建议在编辑页补充摘要用于列表与 Open Graph 展示。'}
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/admin/editor?articleId=${article.articleId}`}
            className="inline-flex items-center justify-center rounded-full bg-gray-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            编辑文章
          </Link>
          <Link
            href={`/blog/${article.url}`}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            预览前台
          </Link>
        </div>
      </td>
    </tr>
  )
}

async function fetchArticles(pageIndex: number) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: '10',
  })

  return adminFetch<PageResult<AdminArticle>>(`/api/v1/articles?${params.toString()}`)
}

export default async function AdminArticlesPage(props: {
  searchParams?: Promise<{ pageIndex?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const pageIndex = Math.max(Number(searchParams?.pageIndex || '1') || 1, 1)
  const response = await fetchArticles(pageIndex)
  const articles = response?.data || []
  const pageSize = response?.pageSize || 10
  const totalCount = response?.totalCount || 0
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1)

  return (
    <section className="space-y-8 py-10">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)] lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-900/80">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-sky-700 uppercase dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            Admin Articles
          </span>
          <PageTitle>文章列表</PageTitle>
          <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            当前页面直接读取后端分页接口，作为后台内容管理的主入口。下一步将在编辑页接入草稿保存、发布与
            Excalidraw 创作能力。
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
            href="/admin/editor"
            className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            新建文章
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
            文章总数
          </p>
          <p className="mt-3 text-3xl font-black text-gray-950 dark:text-gray-50">{totalCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
            当前页码
          </p>
          <p className="mt-3 text-3xl font-black text-gray-950 dark:text-gray-50">{pageIndex}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
            分页规模
          </p>
          <p className="mt-3 text-3xl font-black text-gray-950 dark:text-gray-50">{pageSize}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)] dark:border-gray-800 dark:bg-gray-900/80">
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
                    当前还没有可展示的文章数据。可以先进入新建页创建草稿，再回到这里查看分页结果。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-gray-200 bg-linear-to-br from-amber-50 via-white to-sky-50 p-6 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:from-amber-950/20 dark:via-gray-900 dark:to-sky-950/20">
        <p className="text-sm leading-7 text-gray-700 dark:text-gray-200">
          当前读取分页接口 `pageIndex={pageIndex}` / `pageSize={pageSize}`，总页数 {totalPages}。
        </p>
        <div className="flex gap-3">
          <Link
            href={`/admin/articles?pageIndex=${Math.max(pageIndex - 1, 1)}`}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              pageIndex <= 1
                ? 'pointer-events-none border border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                : 'border border-gray-300 text-gray-900 hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950'
            }`}
          >
            上一页
          </Link>
          <Link
            href={`/admin/articles?pageIndex=${Math.min(pageIndex + 1, totalPages)}`}
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
