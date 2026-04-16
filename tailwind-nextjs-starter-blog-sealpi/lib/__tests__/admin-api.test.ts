import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AdminApiError, adminFetch } from '../admin-api'

vi.mock('../api-config', () => ({
  buildApiUrl: (path: string) => `http://testhost${path}`,
}))

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('AdminApiError', () => {
  it('extends Error', () => {
    const err = new AdminApiError('test error', 404)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AdminApiError)
  })

  it('sets name to AdminApiError', () => {
    const err = new AdminApiError('test error', 404)
    expect(err.name).toBe('AdminApiError')
  })

  it('sets message', () => {
    const err = new AdminApiError('request failed', 500)
    expect(err.message).toBe('request failed')
  })

  it('sets status code', () => {
    const err = new AdminApiError('unauthorized', 401)
    expect(err.status).toBe(401)
  })

  it('preserves status 0 for network errors', () => {
    const err = new AdminApiError('network error', 0)
    expect(err.status).toBe(0)
  })

  it('can be caught as AdminApiError', () => {
    function throwIt() {
      throw new AdminApiError('forbidden', 403)
    }

    expect(() => throwIt()).toThrow(AdminApiError)
    expect(() => throwIt()).toThrow('forbidden')
  })
})

describe('adminFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('throws AdminApiError with status 0 on network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toMatchObject({ status: 0 })
  })

  it('includes the underlying error message on network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('ECONNREFUSED'))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toThrow(/ECONNREFUSED/)
  })

  it('throws with status 401 and includes session-expired hint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ errMessage: '未授权' }, 401))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('登录态可能已失效'),
    })
  })

  it('throws with status 403 and includes admin-permission hint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ errMessage: '无管理员权限' }, 403))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('管理员权限'),
    })
  })

  it('throws with status 404 and includes not-found hint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ errMessage: '文章不存在' }, 404))

    await expect(adminFetch('/api/v1/admin/articles/999')).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining('资源不存在'),
    })
  })

  it('throws with status 409 and includes conflict hint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ errMessage: 'slug 已被占用' }, 409))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('slug'),
    })
  })

  it('throws with status 500 and includes server-error hint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ errMessage: '系统异常' }, 500))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('服务端'),
    })
  })

  it('falls back to errorMessage field when errMessage is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ errorMessage: 'legacy error field' }, 400))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toThrow(/legacy error field/)
  })

  it('falls back to generic message when payload has no error fields', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 400 }))

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toThrow(/管理接口请求失败: 400/)
  })

  it('throws AdminApiError when success:false on 200 response, preserving HTTP status', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, errMessage: '业务规则校验失败' }, 200)
    )

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toMatchObject({
      status: 200,
      message: '业务规则校验失败',
    })
  })

  it('uses errorMessage fallback for success:false payload', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, errorMessage: 'fallback message' }, 200)
    )

    await expect(adminFetch('/api/v1/admin/articles')).rejects.toThrow(/fallback message/)
  })

  it('returns parsed payload on successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: true, data: { articleId: 42, title: 'Test' } }, 200)
    )

    const result = await adminFetch<{
      success: boolean
      data: { articleId: number; title: string }
    }>('/api/v1/admin/articles/42')

    expect(result).toMatchObject({ success: true, data: { articleId: 42, title: 'Test' } })
  })

  it('returns null for non-JSON responses', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 200 }))

    const result = await adminFetch('/api/v1/admin/articles/42')

    expect(result).toBeNull()
  })
})
