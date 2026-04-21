'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminApiError, patchAdminUser } from '@/lib/admin-api'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

type Props = {
  userId: number
  commentPermission?: string
  banned?: boolean
}

type PendingAction = {
  type: 'comment' | 'ban'
  msg: string
  payload: Record<string, unknown>
}

export default function UserPermissionsActions({ userId, commentPermission, banned }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'comment' | 'ban' | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'ok' | 'error'>('ok')

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const openConfirm = (action: 'comment' | 'ban') => {
    if (loading) return
    const payload =
      action === 'comment'
        ? { commentPermission: commentPermission === 'ALLOWED' ? 'READ_ONLY' : 'ALLOWED' }
        : { banned: !banned }
    const msg =
      action === 'comment'
        ? `确认将评论权限改为「${(payload as { commentPermission: string }).commentPermission === 'ALLOWED' ? '可评论' : '只读'}」吗？`
        : `确认${(payload as { banned: boolean }).banned ? '封禁' : '解封'}该用户吗？`
    setPending({ type: action, msg, payload })
  }

  const executeAction = async () => {
    if (!pending) return
    const { type, payload } = pending
    setPending(null)
    setLoading(type)
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
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => openConfirm('comment')}
          disabled={loading !== null}
          className="inline-flex items-center justify-center rounded-full border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-all duration-300 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-500/40 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          {loading === 'comment'
            ? '更新中...'
            : commentPermission === 'ALLOWED'
              ? '限制评论'
              : '允许评论'}
        </button>
        <button
          type="button"
          onClick={() => openConfirm('ban')}
          disabled={loading !== null}
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
            banned
              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-400 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10'
              : 'border-rose-300 text-rose-700 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10'
          }`}
        >
          {loading === 'ban' ? '更新中...' : banned ? '解封' : '封禁'}
        </button>
      </div>
      {pending ? (
        <ConfirmDialog
          title={pending.type === 'ban' ? (banned ? '解封用户' : '封禁用户') : '修改评论权限'}
          description={pending.msg}
          confirmLabel="确认"
          tone={pending.type === 'ban' && !banned ? 'danger' : 'warning'}
          onConfirm={() => void executeAction()}
          onCancel={() => setPending(null)}
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
