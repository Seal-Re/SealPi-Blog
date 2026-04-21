'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from '@/components/Link'
import {
  AdminApiError,
  archiveAdminArticle,
  deleteAdminArticle,
  offlineAdminArticle,
  publishAdminArticle,
} from '@/lib/admin-api'
import { isArchivedStatus, isPublishedStatus } from '@/lib/article-status'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

type PendingOp = 'delete' | 'offline' | 'archive' | 'publish'

const confirmConfig: Record<
  PendingOp,
  {
    title: string
    description: string
    confirmLabel: string
    tone: 'danger' | 'warning' | 'default'
  }
> = {
  delete: {
    title: '删除文章',
    description: '确认删除这篇文章吗？该操作不可撤销。',
    confirmLabel: '删除',
    tone: 'danger',
  },
  offline: {
    title: '文章下线',
    description: '确认将该文章下线为草稿状态吗？',
    confirmLabel: '下线',
    tone: 'warning',
  },
  archive: {
    title: '归档文章',
    description:
      '确认将该文章归档吗？归档后文章将从前台下线，且无法通过管理界面恢复（可删除后重建）。',
    confirmLabel: '归档',
    tone: 'warning',
  },
  publish: {
    title: '发布文章',
    description: '确认将该草稿发布为公开文章吗？',
    confirmLabel: '发布',
    tone: 'default',
  },
}

type Props = {
  articleId: string
  articleUrl: string
  draft?: number
}

export default function AdminArticleRowActions({ articleId, articleUrl, draft }: Props) {
  const isPublished = isPublishedStatus(draft)
  const isArchived = isArchivedStatus(draft)
  const router = useRouter()
  const [runningOp, setRunningOp] = useState<PendingOp | null>(null)
  const [pendingOp, setPendingOp] = useState<PendingOp | null>(null)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'error'>('ok')
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const moreButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMoreOpen(false)
        moreButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [moreOpen])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const executeOp = async (op: PendingOp) => {
    setPendingOp(null)
    setRunningOp(op)
    setMessage('')
    try {
      if (op === 'delete') {
        await deleteAdminArticle(Number(articleId))
        setTone('ok')
        setMessage('文章已删除。')
      } else if (op === 'offline') {
        await offlineAdminArticle(Number(articleId))
        setTone('ok')
        setMessage('文章已下线为草稿。')
      } else if (op === 'archive') {
        await archiveAdminArticle(Number(articleId))
        setTone('ok')
        setMessage('文章已归档。')
      } else if (op === 'publish') {
        await publishAdminArticle(Number(articleId))
        setTone('ok')
        setMessage('文章已发布。')
      }
      router.refresh()
    } catch (error) {
      const text =
        error instanceof AdminApiError
          ? `${error.message}${error.status ? `（HTTP ${error.status}）` : ''}`
          : '操作失败，请稍后重试。'
      setTone('error')
      setMessage(text)
    } finally {
      setRunningOp(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/editor?articleId=${articleId}`}
          className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
        >
          编辑
        </Link>
        <Link
          href={`/admin/preview/${articleId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-wb-rule text-wb-meta hover:border-wb-rule hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center gap-1 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
        >
          预览
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
        </Link>
        {isPublished ? (
          <Link
            href={`/blog/${articleUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center gap-1 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            前台
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
          </Link>
        ) : null}
        {!isPublished && !isArchived ? (
          <button
            type="button"
            onClick={() => setPendingOp('publish')}
            disabled={runningOp !== null}
            className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 transition-all duration-300 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
          >
            {runningOp === 'publish' ? '发布中...' : '发布'}
          </button>
        ) : null}
        {isArchived ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/40 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            已归档
          </span>
        ) : null}
        {/* More menu: groups offline + archive for published articles */}
        {isPublished ? (
          <div ref={moreRef} className="relative">
            <button
              ref={moreButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-label="更多操作"
              onClick={() => setMoreOpen((prev) => !prev)}
              disabled={runningOp !== null}
              className="border-wb-rule text-wb-meta hover:border-wb-ink hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:text-gray-200"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {moreOpen && (
              <div
                role="menu"
                aria-label="文章操作"
                className="dropdown-enter border-wb-rule-soft bg-wb-canvas absolute right-0 z-50 mt-2 w-28 overflow-hidden rounded-xl border shadow-lg dark:border-gray-700 dark:bg-gray-900"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false)
                    setPendingOp('offline')
                  }}
                  disabled={runningOp !== null}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-amber-700 transition-all duration-300 hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-500/10"
                >
                  {runningOp === 'offline' ? '处理中...' : '下线为草稿'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false)
                    setPendingOp('archive')
                  }}
                  disabled={runningOp !== null}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-600 transition-all duration-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {runningOp === 'archive' ? '处理中...' : '归档'}
                </button>
              </div>
            )}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setPendingOp('delete')}
          disabled={runningOp !== null}
          className="inline-flex items-center justify-center rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 transition-all duration-300 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          {runningOp === 'delete' ? '删除中...' : '删除'}
        </button>
        {message ? (
          <div
            className={`toast-enter fixed right-4 bottom-4 z-[80] max-w-xs rounded-xl border px-4 py-3 text-sm shadow-lg ${
              tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>
      {pendingOp ? (
        <ConfirmDialog
          {...confirmConfig[pendingOp]}
          onConfirm={() => void executeOp(pendingOp)}
          onCancel={() => setPendingOp(null)}
        />
      ) : null}
    </>
  )
}
