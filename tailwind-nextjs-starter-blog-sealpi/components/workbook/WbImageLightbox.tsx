'use client'

import { useEffect, useRef, useState } from 'react'

type LightboxState = { src: string; alt: string } | null

/** Attaches a click-to-zoom lightbox to all .wb-body img elements on mount. */
export default function WbImageLightbox() {
  const [lightbox, setLightbox] = useState<LightboxState>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const close = () => setLightbox(null)

  useEffect(() => {
    const imgs = document.querySelectorAll<HTMLImageElement>('.wb-body img')
    const handlers = new Map<HTMLImageElement, () => void>()

    imgs.forEach((img) => {
      img.style.cursor = 'zoom-in'
      const handler = () => setLightbox({ src: img.src, alt: img.alt })
      handlers.set(img, handler)
      img.addEventListener('click', handler)
    })

    return () => {
      handlers.forEach((handler, img) => {
        img.removeEventListener('click', handler)
        img.style.cursor = ''
      })
    }
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [lightbox])

  if (!lightbox) return null

  return (
    <div role="dialog" aria-modal="true" aria-label="图片预览" className="fixed inset-0 z-[100]">
      {/* Backdrop button */}
      <button
        type="button"
        aria-label="关闭图片预览"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={close}
      />
      {/* Image — pointer-events-auto so right-click to save works */}
      <div className="dialog-enter pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightbox.src}
          alt={lightbox.alt}
          className="pointer-events-auto max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
        />
      </div>
      {/* Close button */}
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="关闭预览"
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-95"
        onClick={close}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
