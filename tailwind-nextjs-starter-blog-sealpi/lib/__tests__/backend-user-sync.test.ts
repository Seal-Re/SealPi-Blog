import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncGithubUserToBackend } from '../backend-user-sync'

vi.mock('../api-config', () => ({
  buildApiUrl: (path: string) => `http://testhost${path}`,
}))

const profile = {
  id: 12345,
  login: 'alice',
  name: 'Alice',
  email: 'alice@example.com',
  image: 'https://avatars.github.com/u/12345',
}

describe('syncGithubUserToBackend', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
    delete process.env.BLOG_INTERNAL_SYNC_SECRET
  })

  // -----------------------------------------------------------------------
  // Skip path — no secret configured
  // -----------------------------------------------------------------------

  it('returns ok:true with READ_ONLY when BLOG_INTERNAL_SYNC_SECRET is not set', async () => {
    delete process.env.BLOG_INTERNAL_SYNC_SECRET

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.commentPermission).toBe('READ_ONLY')
      expect(result.banned).toBe(false)
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns ok:true with READ_ONLY when BLOG_INTERNAL_SYNC_SECRET is blank', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = '   '

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Invalid GitHub ID
  // -----------------------------------------------------------------------

  it('returns INVALID_GITHUB_ID when id is a non-numeric string', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'test-secret'

    const result = await syncGithubUserToBackend({ ...profile, id: 'not-a-number' })

    expect(result.ok).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errorCode).toBe('INVALID_GITHUB_ID')
    expect(fetch).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Successful sync
  // -----------------------------------------------------------------------

  it('returns ok:true with commentPermission from backend on success', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'test-secret'
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { commentPermission: 'ALLOWED', nickname: 'Alice', banned: false },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.commentPermission).toBe('ALLOWED')
      expect(result.banned).toBe(false)
    }
  })

  it('falls back to READ_ONLY when backend returns no commentPermission', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'test-secret'
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.commentPermission).toBe('READ_ONLY')
    }
  })

  it('sends Authorization header with correct secret', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'my-sync-secret'
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { commentPermission: 'READ_ONLY' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await syncGithubUserToBackend(profile)

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['X-Blog-Internal-Sync-Secret']).toBe('my-sync-secret')
  })

  // -----------------------------------------------------------------------
  // Banned user
  // -----------------------------------------------------------------------

  it('returns ok:false with banned:true when backend returns BANNED errorCode', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'test-secret'
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, errorCode: 'BANNED', errorMessage: '账号已被封禁' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errorCode).toBe('BANNED')
    expect(result.banned).toBe(true)
  })

  it('returns ok:false with banned:false for non-BANNED error codes', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'test-secret'
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, errorCode: 'SYNC_FAILED' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.banned).toBe(false)
    }
  })

  // -----------------------------------------------------------------------
  // Network / server errors
  // -----------------------------------------------------------------------

  it('returns NETWORK errorCode when fetch throws', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'test-secret'
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errorCode).toBe('NETWORK')
    expect(result.banned).toBe(false)
  })

  it('returns SYNC_FAILED when HTTP status is not ok and no errorCode in body', async () => {
    process.env.BLOG_INTERNAL_SYNC_SECRET = 'test-secret'
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await syncGithubUserToBackend(profile)

    expect(result.ok).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errorCode).toBe('SYNC_FAILED')
  })
})
