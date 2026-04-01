import { auth } from '@/auth'
import { buildApiUrl } from '@/lib/api-config'
import { SignJWT } from 'jose'

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
  accessToken?: string
}

async function createAdminHeaders(headers?: HeadersInit, accessToken?: string) {
  let token = accessToken
  if (!token) {
    const session = await auth()
    const githubUserId = session?.user?.githubUserId
    const secret = process.env.ADMIN_JWT_SECRET
    const claim =
      process.env.ADMIN_JWT_GITHUBUSERIDCLAIM || 'githubUserId'

    if (!secret) {
      throw new AdminApiError('当前环境缺少 ADMIN_JWT_SECRET。', 500)
    }

    if (!githubUserId) {
      throw new AdminApiError('当前管理员会话缺少 githubUserId。', 401)
    }

    token = await new SignJWT({ [claim]: githubUserId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(new TextEncoder().encode(secret))
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
  let response: Response
  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      headers: await createAdminHeaders(init.headers, init.accessToken),
      cache: 'no-store',
    })
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? `网络请求失败（${error.message}）`
        : '网络请求失败'
    throw new AdminApiError(
      `${detail}。请检查后端连通性、CORS 配置以及登录态。`,
      0
    )
  }

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

export async function uploadAdminAsset(file: Blob, fileName = 'asset.bin', accessToken?: string) {
  const formData = new FormData()
  formData.append('file', file, fileName)

  return adminFetch<{ data?: string }>('/api/v1/admin/upload', {
    method: 'POST',
    body: formData,
    accessToken,
  })
}

export async function createAdminArticle(
  payload: AdminArticleFormPayload,
  action: 'draft' | 'publish' = 'draft',
  accessToken?: string
) {
  return adminFetch<ApiEnvelope>('/api/v1/admin/articles?action=' + action, {
    method: 'POST',
    body: toArticleFormData(payload),
    accessToken,
  })
}

export async function updateAdminArticle(
  articleId: number,
  payload: AdminArticleFormPayload,
  action: 'draft' | 'publish' = 'draft',
  accessToken?: string
) {
  return adminFetch<ApiEnvelope>(`/api/v1/admin/articles/${articleId}?action=${action}`, {
    method: 'PUT',
    body: toArticleFormData(payload),
    accessToken,
  })
}
