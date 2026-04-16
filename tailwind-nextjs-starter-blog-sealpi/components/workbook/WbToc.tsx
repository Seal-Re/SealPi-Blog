'use client'

import { useEffect, useState } from 'react'
import { extractHeadings } from '@/lib/toc-utils'

export default function WbToc({ markdown }: { markdown: string }) {
  const headings = extractHeadings(markdown)
  const [activeId, setActiveId] = useState<string>('')
  const [open, setOpen] = useState(true)

  // Collapse by default on narrow viewports
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (headings.length === 0) return

    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null)

    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost entry that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      // Track headings in the top 35% of the viewport, offset for the sticky header
      { rootMargin: '-72px 0px -65% 0px', threshold: 0 }
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown])

  if (headings.length < 2) return null

  return (
    <nav className="border-wb-rule-soft bg-wb-canvas mb-10 rounded-xl border" aria-label="目录">
      {/* Header row — always visible; acts as toggle trigger on mobile */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-inter text-wb-accent flex w-full items-center justify-between px-5 py-4 text-[11px] font-semibold tracking-[0.2em] uppercase transition-colors sm:pointer-events-none sm:cursor-default"
      >
        <span>目录</span>
        {/* Chevron — only visible on small screens */}
        <svg
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 sm:hidden ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {/* Collapsible body */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open
            ? 'max-h-[2000px] pb-4 opacity-100'
            : 'max-h-0 opacity-0 sm:max-h-[2000px] sm:pb-4 sm:opacity-100'
        }`}
      >
        <ol className="space-y-1.5 px-5">
          {headings.map((h) => {
            const isActive = h.id === activeId
            const indentClass = h.level === 3 ? 'ml-3 pl-3' : h.level === 4 ? 'ml-6 pl-3' : ''
            const sizeClass = h.level === 2 ? 'text-sm' : 'text-xs'
            return (
              <li key={`${h.id}-${h.level}`} className={`relative ${indentClass}`}>
                {/* Active left-bar indicator */}
                {isActive ? (
                  <span
                    className="bg-wb-accent absolute top-0.5 bottom-0.5 -left-1 w-0.5 rounded-full"
                    aria-hidden="true"
                  />
                ) : null}
                <a
                  href={`#${h.id}`}
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 640) setOpen(false)
                  }}
                  className={`block leading-snug transition-colors duration-150 ${sizeClass} ${
                    isActive
                      ? 'text-wb-accent pl-2 font-semibold'
                      : 'text-wb-meta hover:text-wb-accent pl-2'
                  }`}
                >
                  {h.text}
                </a>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
