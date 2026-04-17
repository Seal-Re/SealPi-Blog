'use client'

import AdminEditorClient, { type AdminEditorClientRef } from '@/components/admin/AdminEditorClient'
import type { AdminArticle } from '@/lib/blog-api-types'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

type AdminEditorWorkspaceProps = {
  article?: AdminArticle | null
  articleId?: string
  draftHint?: {
    draftCount: number
    latestDraftId?: string
  }
}

export default function AdminEditorWorkspace({
  article,
  articleId,
  draftHint,
}: AdminEditorWorkspaceProps) {
  const router = useRouter()
  const editorRef = useRef<AdminEditorClientRef | null>(null)
  const actionLockRef = useRef(false)
  const [triggeringAction, setTriggeringAction] = useState<'draft' | 'publish' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [resolvedArticleId, setResolvedArticleId] = useState<string | undefined>(articleId)
  const [showDraftHint, setShowDraftHint] = useState(Boolean(draftHint && draftHint.draftCount > 0))
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

  useEffect(() => {
    setResolvedArticleId(article?.articleId ? String(article.articleId) : articleId)
  }, [article?.articleId, articleId])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!editorRef.current?.hasPendingChanges()) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const confirmLeaveWhenDirty = () => {
    if (!editorRef.current?.hasPendingChanges()) {
      return true
    }
    return window.confirm('有未保存的更改，确认离开？')
  }

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
    if (action === 'publish') {
      const confirmed = window.confirm('确认发布此文章？发布后将公开可见。')
      if (!confirmed) {
        return
      }
    }

    actionLockRef.current = true
    setTriggeringAction(action)
    try {
      if (action === 'draft') {
        await editorRef.current.saveDraft()
      } else {
        await editorRef.current.publish()
      }
    } finally {
      actionLockRef.current = false
      setTriggeringAction(null)
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
        disabled={triggeringAction !== null}
        className="border-wb-rule bg-wb-canvas text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
      >
        {triggeringAction === 'draft' ? '保存中...' : '保存草稿'}
      </button>
      <button
        type="button"
        onClick={() => void runAction('publish')}
        disabled={triggeringAction !== null}
        className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
      >
        {triggeringAction === 'publish' ? (
          '发布中...'
        ) : (
          <>
            <span className="bg-wb-paper/80 h-1.5 w-1.5 animate-pulse rounded-full dark:bg-gray-700" />
            发布
          </>
        )}
      </button>
    </>
  )

  return (
    <section className="space-y-4">
      {topbarAnchor ? createPortal(topbarActions, topbarAnchor) : null}

      <div className="border-wb-rule-soft bg-wb-canvas rounded-[2rem] border p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-wb-meta text-xs tracking-[0.24em] uppercase dark:text-gray-400">
              编辑器
            </p>
            <h1 className="text-wb-ink mt-1 text-2xl font-black tracking-tight dark:text-gray-50">
              {resolvedArticleId ? `编辑文章 #${resolvedArticleId}` : '新建文章'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!confirmLeaveWhenDirty()) {
                return
              }
              router.push('/admin/articles')
            }}
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回列表
          </button>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="border-wb-rule-soft rounded-xl border px-3 py-2 dark:border-gray-800">
            <dt className="text-wb-meta text-xs tracking-[0.2em] uppercase">模式</dt>
            <dd className="text-wb-ink mt-1 dark:text-gray-100">
              {resolvedArticleId ? '编辑既有文章' : '创建新文章'}
            </dd>
          </div>
          <div className="border-wb-rule-soft rounded-xl border px-3 py-2 dark:border-gray-800">
            <dt className="text-wb-meta text-xs tracking-[0.2em] uppercase">文章标识</dt>
            <dd className="text-wb-ink mt-1 dark:text-gray-100">{resolvedArticleId || '—'}</dd>
          </div>
          <div className="border-wb-rule-soft rounded-xl border px-3 py-2 dark:border-gray-800">
            <dt className="text-wb-meta text-xs tracking-[0.2em] uppercase">数据来源</dt>
            <dd className="text-wb-ink mt-1 dark:text-gray-100">
              {article ? '已加载文章内容' : '新文章'}
            </dd>
          </div>
        </dl>
      </div>

      <AdminEditorClient
        ref={editorRef}
        article={article}
        onSubmitSuccess={handleSubmitSuccess}
        onArticleIdResolved={(id) => setResolvedArticleId(String(id))}
      />

      {showDraftHint ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[1px]">
          <div className="bg-wb-canvas w-full max-w-lg rounded-2xl border border-amber-200 p-6 shadow-2xl dark:border-amber-500/40 dark:bg-gray-950">
            <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300">有未发布的草稿</h3>
            <p className="text-wb-meta mt-2 text-sm leading-7 dark:text-gray-200">
              {draftHint?.draftCount || 0} 篇草稿尚未发布。
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDraftHint(false)}
                className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
              >
                创建新文章
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/drafts')}
                className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                进入草稿箱
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedback.open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[1px]">
          <div className="bg-wb-canvas w-full max-w-md rounded-2xl border border-emerald-200 p-6 shadow-2xl dark:border-emerald-700/60 dark:bg-gray-950">
            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {feedback.title}
            </h3>
            <p className="text-wb-meta mt-2 text-sm leading-7 dark:text-gray-200">
              {feedback.description}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFeedback((prev) => ({ ...prev, open: false }))}
                className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
              >
                留在当前页
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/articles')}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
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
