'use client'

import { useEffect } from 'react'

type ViewTrackerProps = {
  articleId: string | number
}

/**
 * Fire-and-forget view count increment for a single article.
 * Routes through the Next.js BFF (/api/articles/[id]/view) to avoid CORS.
 * Called once on client mount; errors are silently swallowed so they never
 * affect the reading experience.
 */
export default function ViewTracker({ articleId }: ViewTrackerProps) {
  useEffect(() => {
    const id = Number(articleId)
    if (!id || id <= 0) return

    void fetch(`/api/articles/${id}/view`, { method: 'POST' }).catch(() => {
      // best-effort — ignore network errors
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
