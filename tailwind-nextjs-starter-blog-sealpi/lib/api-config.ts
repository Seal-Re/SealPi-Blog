const _resolved =
  process.env.BLOG_API_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_BLOG_API_BASE_URL?.replace(/\/$/, '')

if (!_resolved && typeof window === 'undefined') {
  console.warn(
    '[api-config] Neither BLOG_API_BASE_URL nor NEXT_PUBLIC_BLOG_API_BASE_URL is set. ' +
      'Falling back to http://127.0.0.1:8080 — this will fail in production.'
  )
}

export const API_BASE_URL = _resolved || 'http://127.0.0.1:8080'

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
