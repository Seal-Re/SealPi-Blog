'use client'

import Link from '@/components/Link'
import AdminEditorClient, { type AdminEditorClientRef } from '@/components/admin/AdminEditorClient'
import type { AdminArticle } from '@/lib/blog-api-types'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

type AdminEditorWorkspaceProps = {
  article?: AdminArticle | null
  articleId?: string
}

export default function AdminEditorWorkspace({ article, articleId }: AdminEditorWorkspaceProps) {
  const router = useRouter()
  const editorRef = useRef<AdminEditorClientRef | null>(null)
  const actionLockRef = useRef(false)
  const [isTriggering, setIsTriggering] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [feedback, setFeedback] = useState<{
    open: boolean
    title: string
    description: string
  }>({
    open: false,
    title: '',
    description: '',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmitSuccess = async (action: 'draft' | 'publish') => {
    if (action === 'draft') {
      setFeedback({
        open: true,
        title: '草稿保存成功',
        description: '草稿与元信息（摘要、封面图）已保存，点击继续返回文章管理列表。',
      })
    } else {
      setFeedback({
        open: true,
        title: '文章发布成功',
        description: '文章已发布，点击继续返回文章管理列表。',
      })
    }
  }

  const runAction = async (action: 'draft' | 'publish') => {
    if (!editorRef.current || editorRef.current.isBusy() || actionLockRef.current) {
      return
    }

    actionLockRef.current = true
    setIsTriggering(true)
    try {
      if (action === 'draft') {
        await editorRef.current.saveDraft()
      } else {
        await editorRef.current.publish()
      }
    } finally {
      actionLockRef.current = false
      setIsTriggering(false)
    }
  }

  const topbarAnchor =
    mounted && typeof document !== 'undefined'
      ? document.getElementById('admin-topbar-actions')
      : null

  const topbarActions = (
    <>
      <button
        type="button"
        onClick={() => void runAction('draft')}
        disabled={isTriggering}
        className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-all duration-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white active:scale-95 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
      >
        {isTriggering ? 'Saving...' : 'Save Draft'}
      </button>
      <button
        type="button"
        onClick={() => void runAction('publish')}
        disabled={isTriggering}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gray-950 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-black active:scale-95 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80 dark:bg-gray-700" />
        Publish
      </button>
    </>
  )

  return (
    <section className="space-y-4">
      {topbarAnchor ? createPortal(topbarActions, topbarAnchor) : null}

      <div className="rounded-[2rem] border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
              Immersive Editor
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-950 dark:text-gray-50">
              {articleId ? `编辑文章 #${articleId}` : '新建文章'}
            </h1>
          </div>
          <Link
            href="/admin/articles"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回列表
          </Link>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
            <dt className="text-xs tracking-[0.2em] text-gray-500 uppercase">模式</dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {articleId ? '编辑既有文章' : '创建新文章'}
            </dd>
          </div>
          <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
            <dt className="text-xs tracking-[0.2em] text-gray-500 uppercase">文章标识</dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {article?.articleId || articleId || '尚未指定 articleId'}
            </dd>
          </div>
          <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800">
            <dt className="text-xs tracking-[0.2em] text-gray-500 uppercase">数据来源</dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {article ? '已从后端读取文章详情' : '新建模式，无需预加载'}
            </dd>
          </div>
        </dl>
      </div>

      <AdminEditorClient ref={editorRef} article={article} onSubmitSuccess={handleSubmitSuccess} />

      {feedback.open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-2xl dark:border-emerald-700/60 dark:bg-gray-950">
            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{feedback.title}</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-200">{feedback.description}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFeedback((prev) => ({ ...prev, open: false }))}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
              >
                留在当前页
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/articles')}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                返回列表
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
