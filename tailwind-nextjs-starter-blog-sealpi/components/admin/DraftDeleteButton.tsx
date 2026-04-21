'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminApiError, deleteAdminArticle } from '@/lib/admin-api'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

type Props = {
  articleId: string
}

export default function DraftDeleteButton({ articleId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'error'>('ok')

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const handleDelete = async () => {
    if (loading) return
    setShowConfirm(false)
    setLoading(true)
    setMessage('')
    try {
      await deleteAdminArticle(Number(articleId))
      setTone('ok')
      setMessage('草稿已删除。')
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

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition-all duration-300 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
      >
        {loading ? '删除中...' : '删除'}
      </button>
      {showConfirm ? (
        <ConfirmDialog
          title="删除草稿"
          description="确认删除这篇草稿吗？该操作不可撤销。"
          confirmLabel="删除"
          tone="danger"
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
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
    </>
  )
}
