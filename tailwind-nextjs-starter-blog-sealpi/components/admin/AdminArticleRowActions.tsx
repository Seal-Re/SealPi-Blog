'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from '@/components/Link'
import { AdminApiError, deleteAdminArticle, offlineAdminArticle } from '@/lib/admin-api'

type Props = {
  articleId: string
  articleUrl: string
  isPublished: boolean
}

export default function AdminArticleRowActions({ articleId, articleUrl, isPublished }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'error'>('ok')

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const handleDelete = async () => {
    if (loading) return
    const ok = window.confirm('确认删除这篇文章吗？该操作不可撤销。')
    if (!ok) return

    setLoading(true)
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
      setLoading(false)
    }
  }

  const handleOffline = async () => {
    if (loading || !isPublished) return
    const ok = window.confirm('确认将该文章下线为草稿状态吗？')
    if (!ok) return

    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Link
        href={`/admin/editor?articleId=${articleId}`}
        className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
      >
        编辑文章
      </Link>
      <Link
        href={`/admin/preview/${articleId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="border-wb-rule text-wb-meta hover:border-wb-rule hover:text-wb-ink inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-medium transition dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
      >
        草稿预览 ↗
      </Link>
      {isPublished ? (
        <Link
          href={`/blog/${articleUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          查看前台 ↗
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void handleOffline()}
        disabled={loading || !isPublished}
        className="inline-flex items-center justify-center rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
      >
        {loading && isPublished ? '处理中...' : '下线'}
      </button>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
      >
        {loading ? '删除中...' : '删除'}
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
