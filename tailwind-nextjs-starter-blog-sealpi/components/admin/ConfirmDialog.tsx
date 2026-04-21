'use client'

import { useEffect, useRef } from 'react'

type Tone = 'danger' | 'warning' | 'default'

type Props = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone
  onConfirm: () => void
  onCancel: () => void
}

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === 'danger') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-rose-600 dark:text-rose-400"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </div>
    )
  }
  if (tone === 'warning') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
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
    )
  }
  return (
    <div className="bg-wb-paper flex h-8 w-8 items-center justify-center rounded-full dark:bg-gray-800">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-wb-meta dark:text-gray-400"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </div>
  )
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  tone = 'default',
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-focus cancel button on mount
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Escape → cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  // Focus trap
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    container.addEventListener('keydown', handler)
    return () => container.removeEventListener('keydown', handler)
  }, [])

  const borderClass =
    tone === 'danger'
      ? 'border-rose-200 dark:border-rose-500/40'
      : tone === 'warning'
        ? 'border-amber-200 dark:border-amber-500/40'
        : 'border-wb-rule-soft dark:border-gray-800'

  const titleClass =
    tone === 'danger'
      ? 'text-rose-700 dark:text-rose-300'
      : tone === 'warning'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-wb-ink dark:text-gray-100'

  const confirmClass =
    tone === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400 dark:bg-rose-500 dark:hover:bg-rose-600'
      : tone === 'warning'
        ? 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-400 dark:bg-amber-500 dark:hover:bg-amber-600'
        : 'bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
    >
      <div
        ref={containerRef}
        className={`dialog-enter bg-wb-canvas w-full max-w-md rounded-2xl border p-6 shadow-2xl dark:bg-gray-950 ${borderClass}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <ToneIcon tone={tone} />
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className={`text-base font-bold ${titleClass}`}>
              {title}
            </h3>
            <p
              id="confirm-dialog-desc"
              className="text-wb-meta mt-1.5 text-sm leading-7 dark:text-gray-300"
            >
              {description}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
