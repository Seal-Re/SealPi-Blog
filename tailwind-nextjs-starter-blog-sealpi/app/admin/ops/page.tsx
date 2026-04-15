import { auth } from '@/auth'
import Link from '@/components/Link'
import { AdminApiError, adminFetch } from '@/lib/admin-api'
import type { PageResult, AdminArticle } from '@/lib/blog-api-types'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: '运维控制台',
  description: '运维控制台 — 系统状态与文章统计',
})

type ArticleStats = {
  total: number
  published: number
  draft: number
}

async function fetchArticleStats(): Promise<ArticleStats> {
  const [totalRes, publishedRes, draftRes] = await Promise.allSettled([
    adminFetch<PageResult<AdminArticle>>('/api/v1/articles?pageIndex=1&pageSize=1'),
    adminFetch<PageResult<AdminArticle>>(
      '/api/v1/articles?pageIndex=1&pageSize=1&status=published'
    ),
    adminFetch<PageResult<AdminArticle>>('/api/v1/articles?pageIndex=1&pageSize=1&status=draft'),
  ])

  return {
    total: totalRes.status === 'fulfilled' ? (totalRes.value?.totalCount ?? 0) : 0,
    published: publishedRes.status === 'fulfilled' ? (publishedRes.value?.totalCount ?? 0) : 0,
    draft: draftRes.status === 'fulfilled' ? (draftRes.value?.totalCount ?? 0) : 0,
  }
}

async function fetchRecentArticles() {
  try {
    const res = await adminFetch<PageResult<AdminArticle>>(
      '/api/v1/articles?pageIndex=1&pageSize=5'
    )
    return res?.data ?? []
  } catch {
    return []
  }
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent?: boolean
}) {
  return (
    <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 dark:border-gray-800 dark:bg-gray-950">
      <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-black ${accent ? 'text-wb-accent' : 'text-wb-ink'} dark:text-gray-50`}
      >
        {value}
      </p>
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export default async function OpsPage() {
  await auth()

  let stats: ArticleStats = { total: 0, published: 0, draft: 0 }
  let statsError = false
  let recentArticles: AdminArticle[] = []

  try {
    ;[stats, recentArticles] = await Promise.all([fetchArticleStats(), fetchRecentArticles()])
  } catch (error) {
    statsError = true
    if (error instanceof AdminApiError) {
      console.error('[ops] stats fetch failed:', error.message)
    }
  }

  const now = new Date()
  const buildTime = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <section className="space-y-8">
      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-5 rounded-[2rem] border p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          <span className="border-wb-rule bg-wb-paper text-wb-accent inline-flex rounded-full border px-4 py-1 text-xs font-semibold tracking-[0.24em] uppercase dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            运维面板
          </span>
          <h1 className="text-wb-ink text-3xl font-black tracking-tight dark:text-white">
            运维控制台
          </h1>
          <p className="text-wb-meta max-w-3xl text-sm leading-7 dark:text-gray-300">
            站点运行状态、文章统计与快速操作入口。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回后台首页
          </Link>
        </div>
      </div>

      {statsError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">统计数据加载失败</p>
          <p className="mt-1">无法从后端获取文章统计信息，请检查后端连通性后重试。</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="文章总数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} accent />
        <StatCard label="草稿中" value={stats.draft} />
        <StatCard label="页面生成" value={buildTime} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-[2rem] border dark:border-gray-800 dark:bg-gray-950">
          <div className="border-wb-rule-soft/60 bg-wb-paper/60 border-b px-6 py-4 dark:border-gray-800 dark:bg-gray-900/40">
            <p className="text-wb-ink text-sm font-semibold dark:text-gray-100">最近文章</p>
          </div>
          <div className="divide-wb-rule-soft/60 divide-y dark:divide-gray-800">
            {recentArticles.length === 0 ? (
              <p className="text-wb-meta px-6 py-8 text-sm dark:text-gray-400">暂无文章数据</p>
            ) : (
              recentArticles.map((a) => (
                <div
                  key={a.articleId}
                  className="flex items-center justify-between gap-4 px-6 py-3"
                >
                  <Link
                    href={`/admin/editor?articleId=${a.articleId}`}
                    className="text-wb-ink hover:text-wb-accent truncate text-sm font-medium transition-colors dark:text-gray-100"
                  >
                    {a.title || '无标题'}
                  </Link>
                  <span className="text-wb-meta shrink-0 text-xs dark:text-gray-500">
                    {formatDate(a.lastmod || a.date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-[2rem] border dark:border-gray-800 dark:bg-gray-950">
          <div className="border-wb-rule-soft/60 bg-wb-paper/60 border-b px-6 py-4 dark:border-gray-800 dark:bg-gray-900/40">
            <p className="text-wb-ink text-sm font-semibold dark:text-gray-100">快速操作</p>
          </div>
          <div className="space-y-3 p-6">
            <Link
              href="/admin/editor?mode=new"
              className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              新建文章
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/admin/articles"
              className="border-wb-rule-soft hover:border-wb-rule hover:bg-wb-paper flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-900"
            >
              <span className="text-wb-ink dark:text-gray-100">文章列表</span>
              <span className="text-wb-meta dark:text-gray-400" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href="/admin/drafts"
              className="border-wb-rule-soft hover:border-wb-rule hover:bg-wb-paper flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-900"
            >
              <span className="text-wb-ink dark:text-gray-100">草稿箱</span>
              <span className="text-wb-meta dark:text-gray-400" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href="/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="border-wb-rule-soft hover:border-wb-rule hover:bg-wb-paper flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-900"
            >
              <span className="text-wb-ink dark:text-gray-100">RSS 订阅源</span>
              <span className="text-wb-meta dark:text-gray-400" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
