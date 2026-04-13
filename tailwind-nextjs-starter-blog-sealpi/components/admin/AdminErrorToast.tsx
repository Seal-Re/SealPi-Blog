'use client'

import { useEffect, useState } from 'react'

type Props = {
  message?: string
}

export default function AdminErrorToast({ message }: Props) {
  const [visible, setVisible] = useState(Boolean(message))

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 3500)
    return () => clearTimeout(timer)
  }, [message])

  if (!message || !visible) return null

  return (
    <div className="fixed right-4 bottom-4 z-[90] max-w-md rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-lg dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      {message}
    </div>
  )
}
