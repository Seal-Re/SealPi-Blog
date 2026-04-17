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

type Props = {
  articleId: string
  articleUrl: string
  draft?: number
}

export default function AdminArticleRowActions({ articleId, articleUrl, draft }: Props) {
  const isPublished = isPublishedStatus(draft)
  const isArchived = isArchivedStatus(draft)
  const router = useRouter()
  const [runningOp, setRunningOp] = useState<'delete' | 'offline' | 'archive' | 'publish' | null>(
    null
  )
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'error'>('ok')
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const handleDelete = async () => {
    if (runningOp) return
    const ok = window.confirm('确认删除这篇文章吗？该操作不可撤销。')
    if (!ok) return

    setRunningOp('delete')
    setMessage('')
    try {
      await deleteAdminArticle(Number(articleId))
      setTone('ok')
      setMessage('文章已删除。')
      router.refresh()
    } catch (error) {
      const text =
        error instanceof AdminApiError
          ? `${error.message}${error.status ? `（HTTP ${error.status}）` : ''}`
          : '删除失败，请稍后重试。'
      setTone('error')
      setMessage(text)
    } finally {
      setRunningOp(null)
    }
  }

  const handleOffline = async () => {
    if (runningOp || !isPublished) return
    const ok = window.confirm('确认将该文章下线为草稿状态吗？')
    if (!ok) return

    setRunningOp('offline')
    setMessage('')
    try {
      await offlineAdminArticle(Number(articleId))
      setTone('ok')
      setMessage('文章已下线为草稿。')
      router.refresh()
    } catch (error) {
      const text =
        error instanceof AdminApiError
          ? `${error.message}${error.status ? `（HTTP ${error.status}）` : ''}`
          : '下线失败，请稍后重试。'
      setTone('error')
      setMessage(text)
    } finally {
      setRunningOp(null)
    }
  }

  const handleArchive = async () => {
    if (runningOp || !isPublished) return
    const ok = window.confirm(
      '确认将该文章归档吗？归档后文章将从前台下线，且无法通过管理界面恢复（可删除后重建）。'
    )
    if (!ok) return

    setRunningOp('archive')
    setMessage('')
    try {
      await archiveAdminArticle(Number(articleId))
      setTone('ok')
      setMessage('文章已归档。')
      router.refresh()
    } catch (error) {
      const text =
        error instanceof AdminApiError
          ? `${error.message}${error.status ? `（HTTP ${error.status}）` : ''}`
          : '归档失败，请稍后重试。'
      setTone('error')
      setMessage(text)
    } finally {
      setRunningOp(null)
    }
  }

  const handlePublish = async () => {
    if (runningOp || isPublished) return
    const ok = window.confirm('确认将该草稿发布为公开文章吗？')
    if (!ok) return

    setRunningOp('publish')
    setMessage('')
    try {
      await publishAdminArticle(Number(articleId))
      setTone('ok')
      setMessage('文章已发布。')
      router.refresh()
    } catch (error) {
      const text =
        error instanceof AdminApiError
          ? `${error.message}${error.status ? `（HTTP ${error.status}）` : ''}`
          : '发布失败，请稍后重试。'
      setTone('error')
      setMessage(text)
    } finally {
      setRunningOp(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/editor?articleId=${articleId}`}
        className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
      >
        编辑
      </Link>
      <Link
        href={`/admin/preview/${articleId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="border-wb-rule text-wb-meta hover:border-wb-rule hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
      >
        预览 ↗
      </Link>
      {isPublished ? (
        <Link
          href={`/blog/${articleUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          前台 ↗
        </Link>
      ) : null}
      {!isPublished && !isArchived ? (
        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={runningOp !== null}
          className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        >
          {runningOp === 'publish' ? '发布中...' : '发布'}
        </button>
      ) : null}
      {isArchived ? (
        <span className="text-wb-meta inline-flex items-center rounded-full border border-gray-200 px-3 py-2 text-xs font-medium dark:border-gray-700 dark:text-gray-500">
          已归档
        </span>
      ) : null}
      {/* More menu: groups offline + archive for published articles */}
      {isPublished ? (
        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            disabled={runningOp !== null}
            className="border-wb-rule text-wb-meta hover:border-wb-ink hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:text-gray-200"
            title="更多操作"
          >
            •••
          </button>
          {moreOpen && (
            <div className="border-wb-rule-soft bg-wb-canvas absolute right-0 z-50 mt-2 w-28 overflow-hidden rounded-xl border shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  void handleOffline()
                }}
                disabled={runningOp !== null}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                {runningOp === 'offline' ? '处理中...' : '下线为草稿'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  void handleArchive()
                }}
                disabled={runningOp !== null}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {runningOp === 'archive' ? '处理中...' : '归档'}
              </button>
            </div>
          )}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={runningOp !== null}
        className="inline-flex items-center justify-center rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
      >
        {runningOp === 'delete' ? '删除中...' : '删除'}
      </button>
      {message ? (
        <div
          className={`fixed right-4 bottom-4 z-[80] rounded-xl border px-4 py-3 text-sm shadow-lg ${
            tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  )
}
