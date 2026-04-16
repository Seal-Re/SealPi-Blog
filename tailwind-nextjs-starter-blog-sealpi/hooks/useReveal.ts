'use client'

import { useEffect } from 'react'

/**
 * Attaches a single IntersectionObserver that reveals elements marked
 * [data-reveal]. Start state (CSS): opacity 0.35, blur(4px). On intersect,
 * the `data-revealed` attribute is set; CSS transitions to final state.
 *
 * Respects prefers-reduced-motion by skipping the observer entirely.
 */
export default function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')

    if (prefersReduced) {
      targets.forEach((el) => el.setAttribute('data-revealed', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}
