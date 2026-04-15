import { auth } from '@/auth'
import Link from '@/components/Link'
import Image from 'next/image'
import { AdminApiError, adminFetch } from '@/lib/admin-api'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Admin Drafts',
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
    <div className="group flex flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-950">
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-900">
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
            <span className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase dark:text-gray-600">
              无封面
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatDateLabel(article.lastmod || article.date)}
        </p>
        <h3 className="mt-2 line-clamp-2 text-base font-bold text-gray-950 dark:text-gray-50">
          {article.title || '无标题'}
        </h3>
        {article.summary ? (
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {article.summary}
          </p>
        ) : (
          <p className="mt-2 flex-1 text-sm text-gray-400 italic dark:text-gray-600">暂无摘要</p>
        )}
        <Link
          href={`/admin/editor?articleId=${article.articleId}`}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-950 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-gray-800 active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
        >
          继续编辑
        </Link>
      </div>
    </div>
  )
}

export default async function AdminDraftsPage() {
  await auth()

  let drafts: AdminArticle[] = []
  let loadError = ''

  try {
    const response = await adminFetch<PageResult<AdminArticle>>(
      '/api/v1/articles?status=draft&pageSize=50&pageIndex=1'
    )
    drafts = response?.data || []
  } catch (error) {
    if (error instanceof AdminApiError) {
      loadError = `${error.message} (HTTP ${error.status})`
    } else {
      loadError = '读取草稿列表失败，请稍后重试。'
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-gray-200 bg-white p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-amber-700 uppercase dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            Drafts
          </span>
          <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl dark:text-white">
            草稿库
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            所有已保存的草稿，点击卡片可继续编辑。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/editor?mode=new"
            className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
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
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-gray-200 bg-white py-20 text-center dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">暂无草稿</p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            在编辑器中保存草稿后，它将出现在这里。
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((article) => (
            <DraftCard key={article.articleId} article={article} />
          ))}
        </div>
      )}
    </section>
  )
}
