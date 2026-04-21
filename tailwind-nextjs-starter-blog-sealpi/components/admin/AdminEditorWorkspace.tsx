'use client'

import AdminEditorClient, { type AdminEditorClientRef } from '@/components/admin/AdminEditorClient'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import type { AdminArticle } from '@/lib/blog-api-types'
import { isArchivedStatus, isPublishedStatus } from '@/lib/article-status'
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
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
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

  // Escape → dismiss draft hint
  useEffect(() => {
    if (!showDraftHint) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowDraftHint(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showDraftHint])

  // Escape → dismiss feedback modal
  useEffect(() => {
    if (!feedback.open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setFeedback((prev) => ({ ...prev, open: false }))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [feedback.open])

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
        className="border-wb-rule bg-wb-canvas text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
      >
        {triggeringAction === 'draft' ? '保存中...' : '保存草稿'}
      </button>
      <button
        type="button"
        onClick={() => setShowPublishConfirm(true)}
        disabled={triggeringAction !== null}
        className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
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
    <section className="wb-page-enter space-y-4">
      {topbarAnchor ? createPortal(topbarActions, topbarAnchor) : null}

      <div className="border-wb-rule-soft bg-wb-canvas relative overflow-hidden rounded-[2rem] border p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.09),transparent_55%),radial-gradient(circle_at_top_right,rgba(201,181,151,0.07),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.08),transparent_55%),radial-gradient(circle_at_top_right,rgba(166,88,43,0.04),transparent_40%)]" />
        <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-wb-meta text-xs tracking-[0.24em] uppercase dark:text-gray-400">
              编辑器
            </p>
            <h1 className="text-wb-ink mt-1 text-2xl font-black tracking-tight dark:text-gray-50">
              {resolvedArticleId
                ? article?.title && article.title !== '未命名草稿'
                  ? article.title
                  : `编辑文章 #${resolvedArticleId}`
                : '新建文章'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              if (editorRef.current?.hasPendingChanges()) {
                setShowLeaveConfirm(true)
              } else {
                router.push('/admin/articles')
              }
            }}
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回列表
          </button>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-wb-rule-soft rounded-xl border px-3 py-2 dark:border-gray-800">
            <dt className="text-wb-meta text-xs tracking-[0.2em] uppercase">模式</dt>
            <dd className="text-wb-ink mt-1 dark:text-gray-100">
              {resolvedArticleId ? '编辑既有文章' : '创建新文章'}
            </dd>
          </div>
          <div className="border-wb-rule-soft rounded-xl border px-3 py-2 dark:border-gray-800">
            <dt className="text-wb-meta text-xs tracking-[0.2em] uppercase">文章标识</dt>
            <dd className="text-wb-ink mt-1 tabular-nums dark:text-gray-100">
              {resolvedArticleId || '—'}
            </dd>
          </div>
          <div className="border-wb-rule-soft rounded-xl border px-3 py-2 dark:border-gray-800">
            <dt className="text-wb-meta text-xs tracking-[0.2em] uppercase">Slug</dt>
            <dd className="text-wb-ink font-geist-mono mt-1 truncate text-xs dark:text-gray-100">
              {article?.url || '—'}
            </dd>
          </div>
          <div className="border-wb-rule-soft rounded-xl border px-3 py-2 dark:border-gray-800">
            <dt className="text-wb-meta text-xs tracking-[0.2em] uppercase">发布状态</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5">
              {article == null ? (
                <span className="text-wb-meta dark:text-gray-400">新文章</span>
              ) : isArchivedStatus(article.draft) ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
                  <span className="text-amber-700 dark:text-amber-300">已归档</span>
                </>
              ) : isPublishedStatus(article.draft) ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  <a
                    href={`/blog/${article.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-visible:ring-wb-accent inline-flex items-center gap-1 rounded text-emerald-700 underline-offset-2 transition-colors hover:underline focus-visible:ring-1 focus-visible:outline-none dark:text-emerald-300"
                  >
                    已发布
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
                  </a>
                </>
              ) : (
                <>
                  <span
                    className="bg-wb-rule h-2 w-2 rounded-full dark:bg-gray-500"
                    aria-hidden="true"
                  />
                  <span className="text-wb-ink dark:text-gray-100">草稿</span>
                </>
              )}
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="有未发布的草稿"
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
        >
          <div className="dialog-enter bg-wb-canvas w-full max-w-lg rounded-2xl border border-amber-200 p-6 shadow-2xl dark:border-amber-500/40 dark:bg-gray-950">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-amber-700 dark:text-amber-300">
                  有未发布的草稿
                </h3>
                <p className="text-wb-meta mt-1.5 text-sm leading-7 tabular-nums dark:text-gray-200">
                  {draftHint?.draftCount || 0} 篇草稿尚未发布。
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDraftHint(false)}
                className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
              >
                创建新文章
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/drafts')}
                className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
              >
                进入草稿箱
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedback.open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={feedback.title}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
        >
          <div className="dialog-enter bg-wb-canvas w-full max-w-md rounded-2xl border border-emerald-200 p-6 shadow-2xl dark:border-emerald-700/60 dark:bg-gray-950">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                  {feedback.title}
                </h3>
                <p className="text-wb-meta mt-1.5 text-sm leading-7 dark:text-gray-200">
                  {feedback.description}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFeedback((prev) => ({ ...prev, open: false }))}
                className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
              >
                留在当前页
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/articles')}
                className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                返回列表
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLeaveConfirm ? (
        <ConfirmDialog
          title="有未保存的更改"
          description="确认离开当前页面吗？未保存的更改将会丢失。"
          confirmLabel="离开"
          cancelLabel="继续编辑"
          tone="warning"
          onConfirm={() => router.push('/admin/articles')}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      ) : null}

      {showPublishConfirm ? (
        <ConfirmDialog
          title="发布文章"
          description="确认发布此文章？发布后将公开可见。"
          confirmLabel="发布"
          onConfirm={() => {
            setShowPublishConfirm(false)
            void runAction('publish')
          }}
          onCancel={() => setShowPublishConfirm(false)}
        />
      ) : null}
    </section>
  )
}
