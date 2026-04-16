'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminApiError, patchAdminUser } from '@/lib/admin-api'

type Props = {
  userId: number
  commentPermission?: string
  banned?: boolean
}

export default function UserPermissionsActions({ userId, commentPermission, banned }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'comment' | 'ban' | null>(null)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'error'>('ok')

  const handleAction = async (action: 'comment' | 'ban') => {
    if (loading) return

    const payload =
      action === 'comment'
        ? { commentPermission: commentPermission === 'ALLOWED' ? 'READ_ONLY' : 'ALLOWED' }
        : { banned: !banned }

    const confirmMsg =
      action === 'comment'
        ? `确认将评论权限改为「${payload.commentPermission === 'ALLOWED' ? '可评论' : '只读'}」吗？`
        : `确认${payload.banned ? '封禁' : '解封'}该用户吗？`

    if (!window.confirm(confirmMsg)) return

    setLoading(action)
    try {
      await patchAdminUser(userId, payload)
      setTone('ok')
      setMessage('操作成功。')
      router.refresh()
    } catch (error) {
      const text =
        error instanceof AdminApiError
          ? `${error.message}${error.status ? `（HTTP ${error.status}）` : ''}`
          : '操作失败，请稍后重试。'
      setTone('error')
      setMessage(text)
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => void handleAction('comment')}
          disabled={loading !== null}
          className="inline-flex items-center justify-center rounded-full border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-500/40 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          {loading === 'comment'
            ? '更新中...'
            : commentPermission === 'ALLOWED'
              ? '限制评论'
              : '允许评论'}
        </button>
        <button
          type="button"
          onClick={() => void handleAction('ban')}
          disabled={loading !== null}
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            banned
              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10'
              : 'border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10'
          }`}
        >
          {loading === 'ban' ? '更新中...' : banned ? '解封' : '封禁'}
        </button>
      </div>
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
