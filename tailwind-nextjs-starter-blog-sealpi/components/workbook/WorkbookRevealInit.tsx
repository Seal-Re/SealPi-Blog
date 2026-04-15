'use client'

import useReveal from '@/hooks/useReveal'

/** Mounts the IntersectionObserver that drives [data-reveal] animations. */
export default function WorkbookRevealInit() {
  useReveal()
  return null
}
