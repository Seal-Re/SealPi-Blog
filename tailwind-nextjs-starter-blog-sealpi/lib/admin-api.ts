type ApiEnvelope = {
  success?: boolean
  errCode?: string
  errMessage?: string
  errorCode?: string
  errorMessage?: string
}
import { buildApiUrl } from '@/lib/api-config'

export class AdminApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

function getStatusHint(status: number) {
  if (status === 401) {
    return '登录态可能已失效，请重新登录后重试。'
  }
  if (status === 403) {
    return '当前账号没有管理员权限，请检查管理员白名单配置。'
  }
  if (status === 404) {
    return '目标资源不存在，可能已被删除或链接已过期。'
  }
  if (status === 409) {
    return '请求与现有数据冲突，请检查 slug 等唯一字段后重试。'
  }
  if (status >= 500) {
    return '服务端处理异常，请稍后重试并检查后端日志。'
  }
  return ''
}

type AdminRequestInit = Omit<RequestInit, 'headers'> & { headers?: HeadersInit }

function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  // Backend API should always go directly to Java service.
  if (path.startsWith('/api/v1/')) {
    return buildApiUrl(path)
  }
  // Admin BFF APIs stay on Next origin.
  if (typeof window !== 'undefined') {
    return path
  }

  const origin =
    process.env.AUTH_URL?.replace(/\/$/, '') ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    (() => {
      console.warn(
        '[admin-api] Neither AUTH_URL nor NEXTAUTH_URL is set. ' +
          'Falling back to http://127.0.0.1:13999 — BFF self-calls will fail in production.'
      )
      return 'http://127.0.0.1:13999'
    })()
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return (await response.json()) as T
}

export async function adminFetch<T>(path: string, init: AdminRequestInit = {}) {
  let response: Response
  try {
    response = await fetch(resolveRequestUrl(path), {
      ...init,
      headers: init.headers,
      cache: 'no-store',
    })
  } catch (error) {
    const detail =
      error instanceof Error && error.message ? `网络请求失败（${error.message}）` : '网络请求失败'
    throw new AdminApiError(`${detail}。请检查后端连通性、CORS 配置以及登录态。`, 0)
  }

  const payload = await parseJsonSafely<T & ApiEnvelope>(response)

  if (!response.ok) {
    const backendMessage =
      payload?.errMessage || payload?.errorMessage || `管理接口请求失败: ${response.status}`
    const statusHint = getStatusHint(response.status)
    throw new AdminApiError(
      statusHint ? `${backendMessage} ${statusHint}` : backendMessage,
      response.status
    )
  }

  if (payload && payload.success === false) {
    throw new AdminApiError(
      payload.errMessage || payload.errorMessage || '管理接口返回业务失败',
      response.status || 400
    )
  }

  return payload
}

export type AdminArticleFormPayload = {
  title: string
  url: string
  draftJson: string
  summary?: string
  coverImageUrl?: string
  previewImage?: Blob | null
  draftBodyMd?: string
  coverCaption?: string
  tags?: string[]
}

function appendIfPresent(formData: FormData, key: string, value?: string | null) {
  if (value && value.trim()) {
    formData.append(key, value)
  }
}

function toArticleFormData(payload: AdminArticleFormPayload) {
  const formData = new FormData()
  formData.append('title', payload.title)
  formData.append('url', payload.url)
  formData.append('draftJson', payload.draftJson)
  appendIfPresent(formData, 'summary', payload.summary)

  if (payload.coverImageUrl?.trim()) {
    formData.append('coverImageUrl', payload.coverImageUrl.trim())
  }

  if (payload.previewImage) {
    formData.append('previewImage', payload.previewImage, 'preview-image.png')
  }

  appendIfPresent(formData, 'draftBodyMd', payload.draftBodyMd)
  appendIfPresent(formData, 'coverCaption', payload.coverCaption)

  if (payload.tags !== undefined) {
    // Always send tags field when provided (even empty string to clear all tags)
    formData.append('tags', payload.tags.join(','))
  }

  return formData
}

export async function uploadAdminAsset(file: Blob, fileName = 'asset.bin') {
  const formData = new FormData()
  formData.append('file', file, fileName)

  return adminFetch<{ data?: string }>('/api/admin/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function createAdminArticle(
  payload: AdminArticleFormPayload,
  action: 'draft' | 'publish' = 'draft'
) {
  return adminFetch<ApiEnvelope & { data?: number }>('/api/admin/articles?action=' + action, {
    method: 'POST',
    body: toArticleFormData(payload),
  })
}

export async function updateAdminArticle(
  articleId: number,
  payload: AdminArticleFormPayload,
  action: 'draft' | 'publish' = 'draft'
) {
  return adminFetch<ApiEnvelope>(`/api/admin/articles/${articleId}?action=${action}`, {
    method: 'PUT',
    body: toArticleFormData(payload),
  })
}

export async function deleteAdminArticle(articleId: number) {
  return adminFetch<ApiEnvelope>(`/api/admin/articles/${articleId}`, {
    method: 'DELETE',
  })
}

export async function offlineAdminArticle(articleId: number) {
  return adminFetch<ApiEnvelope>(`/api/admin/articles/${articleId}/offline`, {
    method: 'POST',
  })
}

export async function archiveAdminArticle(articleId: number) {
  return adminFetch<ApiEnvelope>(`/api/admin/articles/${articleId}/archive`, {
    method: 'POST',
  })
}

export async function publishAdminArticle(articleId: number) {
  return adminFetch<ApiEnvelope>(`/api/admin/articles/${articleId}/publish`, {
    method: 'POST',
  })
}

export async function patchAdminUser(
  userId: number,
  payload: { commentPermission?: string; banned?: boolean }
) {
  return adminFetch<ApiEnvelope>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
