'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminApiError, publishAdminArticle } from '@/lib/admin-api'

type Props = {
  articleId: string
  canPublish: boolean
}

export default function DraftPublishButton({ articleId, canPublish }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'error'>('ok')

  if (!canPublish) return null

  const handlePublish = async () => {
    if (loading) return
    const ok = window.confirm('确认将该草稿发布为公开文章吗？')
    if (!ok) return

    setLoading(true)
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
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handlePublish()}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
      >
        {loading ? '发布中...' : '发布'}
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
    </>
  )
}
