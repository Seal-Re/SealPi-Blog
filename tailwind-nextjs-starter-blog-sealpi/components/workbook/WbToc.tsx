'use client'

import { useEffect, useState } from 'react'
import { extractHeadings, type TocHeading } from '@/lib/toc-utils'

export default function WbToc({ markdown }: { markdown: string }) {
  const headings = extractHeadings(markdown)
  const [activeId, setActiveId] = useState<string>('')

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
    <nav
      className="border-wb-rule-soft bg-wb-canvas mb-10 rounded-xl border px-5 py-4"
      aria-label="目录"
    >
      <p className="font-inter text-wb-accent mb-3 text-[11px] font-semibold tracking-[0.2em] uppercase">
        目录
      </p>
      <ol className="space-y-1.5">
        {headings.map((h) => {
          const isActive = h.id === activeId
          const indentClass =
            h.level === 3
              ? 'border-wb-rule-soft ml-3 border-l pl-3'
              : h.level === 4
                ? 'border-wb-rule-soft ml-6 border-l pl-3'
                : ''
          const sizeClass = h.level === 2 ? 'text-sm' : 'text-xs'
          return (
            <li key={`${h.id}-${h.level}`} className={indentClass}>
              <a
                href={`#${h.id}`}
                className={`block leading-snug transition-colors duration-150 ${sizeClass} ${
                  isActive ? 'text-wb-accent font-medium' : 'text-wb-meta hover:text-wb-accent'
                }`}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
