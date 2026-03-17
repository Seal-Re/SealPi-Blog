import { auth } from '@/auth'
import { buildApiUrl } from '@/lib/api-config'

type ApiEnvelope = {
  success?: boolean
  errCode?: string
  errMessage?: string
}

export class AdminApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

type AdminRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit
}

async function createAdminHeaders(headers?: HeadersInit) {
  const session = await auth()
  const token = session?.accessToken

  if (!token) {
    throw new AdminApiError('当前管理员会话缺少 access token。', 401)
  }

  const nextHeaders = new Headers(headers)
  nextHeaders.set('Authorization', `Bearer ${token}`)
  return nextHeaders
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return (await response.json()) as T
}

export async function adminFetch<T>(path: string, init: AdminRequestInit = {}) {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: await createAdminHeaders(init.headers),
    cache: 'no-store',
  })

  const payload = await parseJsonSafely<T & ApiEnvelope>(response)

  if (!response.ok) {
    throw new AdminApiError(
      payload?.errMessage || `管理接口请求失败: ${response.status}`,
      response.status
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

  return formData
}

export async function uploadAdminAsset(file: Blob) {
  const formData = new FormData()
  formData.append('file', file, 'asset.bin')

  return adminFetch<{ data?: string }>('/api/v1/admin/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function createAdminArticle(
  payload: AdminArticleFormPayload,
  action: 'draft' | 'publish' = 'draft'
) {
  return adminFetch<ApiEnvelope>('/api/v1/admin/articles?action=' + action, {
    method: 'POST',
    body: toArticleFormData(payload),
  })
}

export async function updateAdminArticle(
  articleId: number,
  payload: AdminArticleFormPayload,
  action: 'draft' | 'publish' = 'draft'
) {
  return adminFetch<ApiEnvelope>(`/api/v1/admin/articles/${articleId}?action=${action}`, {
    method: 'PUT',
    body: toArticleFormData(payload),
  })
}
