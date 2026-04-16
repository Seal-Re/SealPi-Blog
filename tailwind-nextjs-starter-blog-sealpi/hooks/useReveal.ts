'use client'

import { useEffect } from 'react'

/**
 * Attaches a single IntersectionObserver that reveals elements marked
 * [data-reveal]. Start state (CSS): opacity 0.35, blur(4px). On intersect,
 * the `data-revealed` attribute is set; CSS transitions to final state.
 *
 * A MutationObserver watches the document body for newly added [data-reveal]
 * nodes so that Next.js client-side navigation (which swaps page content
 * without remounting the layout) also triggers reveal animations.
 *
 * Respects prefers-reduced-motion by skipping the observer entirely.
 */
export default function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      document
        .querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
        .forEach((el) => el.setAttribute('data-revealed', 'true'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    const observeNew = (root: Element | Document = document) => {
      ;(root instanceof Element ? root : document)
        .querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
        .forEach((el) => io.observe(el))
    }

    // Observe elements already in the DOM
    observeNew()

    // Watch for elements added by client-side navigation
    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          // The node itself may carry [data-reveal]
          if (node.hasAttribute('data-reveal') && !node.hasAttribute('data-revealed')) {
            io.observe(node as HTMLElement)
          }
          // Or its subtree may contain [data-reveal] descendants
          node
            .querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
            .forEach((el) => io.observe(el))
        })
      }
    })

    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}
