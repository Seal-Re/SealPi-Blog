import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPublishedArticlesPage,
  fetchPublishedTags,
  BLOG_POSTS_PER_PAGE,
} from '../public-blog-api'

// api-config uses BLOG_API_BASE_URL env var — stub it
vi.mock('../api-config', () => ({
  buildApiUrl: (path: string) => `http://testhost${path}`,
}))

describe('fetchPublishedArticlesPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('returns empty page when fetch throws (network error)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const result = await fetchPublishedArticlesPage(1)

    expect(result.items).toHaveLength(0)
    expect(result.totalCount).toBe(0)
    expect(result.totalPages).toBe(1)
    expect(result.pageIndex).toBe(1)
  })

  it('returns empty page when response is not ok (503)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }))

    const result = await fetchPublishedArticlesPage(1)

    expect(result.items).toHaveLength(0)
    expect(result.totalCount).toBe(0)
  })

  it('returns parsed items when response is ok', async () => {
    const mockPayload = {
      data: [
        {
          articleId: '1',
          title: 'Test',
          url: 'test',
          summary: 'A summary',
          coverImageUrl: null,
          viewCount: 5,
          date: '2026-01-01',
          tags: [],
          draft: 1,
          count: 0,
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: BLOG_POSTS_PER_PAGE,
      totalPage: 1,
    }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockPayload), { status: 200 }))

    const result = await fetchPublishedArticlesPage(1)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Test')
    expect(result.items[0].slug).toBe('test')
    expect(result.totalCount).toBe(1)
  })

  it('preserves pageIndex in empty network-error result', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await fetchPublishedArticlesPage(3, 10)

    expect(result.pageIndex).toBe(3)
    expect(result.pageSize).toBe(10)
  })
})

describe('fetchPublishedTags', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('returns empty array when tags fetch throws and article fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const tags = await fetchPublishedTags()

    expect(tags).toEqual([])
  })

  it('returns tags from /api/v1/tags when available', async () => {
    const mockTags = [
      { name: 'Java', count: 3 },
      { name: 'Next.js', count: 1 },
    ]
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockTags), { status: 200 }))

    const tags = await fetchPublishedTags()

    expect(tags).toHaveLength(2)
    expect(tags[0].name).toBe('Java')
    expect(tags[0].count).toBe(3)
    expect(tags[0].slug).toBeDefined()
  })
})
