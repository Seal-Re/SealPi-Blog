export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BLOG_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8080'

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
