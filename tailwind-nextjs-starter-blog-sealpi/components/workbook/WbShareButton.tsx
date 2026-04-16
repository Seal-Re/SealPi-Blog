'use client'

import { useEffect, useState } from 'react'

type WbShareButtonProps = {
  title?: string
}

export default function WbShareButton({ title }: WbShareButtonProps) {
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  const handleShare = async () => {
    const url = window.location.href
    const text = title || document.title
    try {
      await navigator.share({ title: text, url })
    } catch {
      // AbortError = user cancelled — treat as no-op
    }
  }

  if (!canShare) return null

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="border-wb-rule text-wb-meta hover:border-wb-accent hover:text-wb-accent inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition-colors duration-150"
      aria-label="分享文章"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      分享
    </button>
  )
}
