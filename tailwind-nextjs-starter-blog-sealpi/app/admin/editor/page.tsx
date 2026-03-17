import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import AdminEditorClient from '@/components/admin/AdminEditorClient'
import { genPageMetadata } from 'app/seo'

import { auth } from '@/auth'
import { adminFetch } from '@/lib/admin-api'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'

export const metadata = genPageMetadata({
  title: 'Admin Editor',
  description: '管理后台文章编辑入口。',
})

async function fetchArticleDetail(articleId: string) {
  const numericId = Number(articleId)
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const response = await adminFetch<ApiResult<AdminArticle>>(`/api/v1/articles/${numericId}`)
  return response?.data || null
}

function ChecklistItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.2)] dark:border-gray-800 dark:bg-gray-900/80">
      <h2 className="text-lg font-black tracking-tight text-gray-950 dark:text-gray-50">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}

export default async function AdminEditorPage(props: {
  searchParams?: Promise<{ articleId?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const articleId = searchParams?.articleId
  const article = articleId ? await fetchArticleDetail(articleId) : null

  return (
    <section className="space-y-8 py-10">
      <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)] dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-amber-300/80 bg-amber-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-amber-700 uppercase dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
              Editor Workspace
            </span>
            <PageTitle>{articleId ? `编辑文章 #${articleId}` : '新建文章'}</PageTitle>
            <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
              当前页面已接入 Excalidraw 编辑器、草稿保存与发布动作，表单字段直接对齐后台 multipart
              写接口，并在提交时自动导出预览图。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/articles"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
            >
              返回文章列表
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              返回后台首页
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChecklistItem
          title="编辑器已接入"
          description="页面直接挂载 Excalidraw 画布，并把内容序列化为 database 模式 JSON，供后端落库。"
        />
        <ChecklistItem
          title="保存与发布"
          description="保存草稿和直接发布都走现有管理端 multipart 接口，并自动导出 PNG 预览图。"
        />
        <ChecklistItem
          title="新建/编辑双模式"
          description="支持 `/admin/editor` 新建入口，也支持 `/admin/editor?articleId=...` 回填既有文章。"
        />
      </div>

      <div className="rounded-[2rem] border border-dashed border-gray-300 bg-gray-50/80 p-8 dark:border-gray-700 dark:bg-gray-900/60">
        <h2 className="text-xl font-black tracking-tight text-gray-950 dark:text-gray-50">
          当前编辑上下文
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
              模式
            </dt>
            <dd className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-200">
              {articleId ? '编辑既有文章' : '创建新文章'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
              文章标识
            </dt>
            <dd className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-200">
              {article?.articleId || articleId || '尚未指定 articleId'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
              数据来源
            </dt>
            <dd className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-200">
              {article ? '已从后端读取文章详情' : '新建模式，无需预加载'}
            </dd>
          </div>
        </dl>
      </div>

      <AdminEditorClient article={article} />
    </section>
  )
}
