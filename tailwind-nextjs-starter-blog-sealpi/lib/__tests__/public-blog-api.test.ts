import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPublishedArticlesPage,
  fetchPublishedArticles,
  fetchPublishedTags,
  fetchAdjacentBySlug,
  fetchAllPublishedArticles,
  fetchTopViewedArticles,
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

describe('fetchAdjacentBySlug', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('returns empty object when fetch throws (network error)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const result = await fetchAdjacentBySlug('my-article', [])

    expect(result).toEqual({})
  })

  it('returns empty object when response is not ok (404)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }))

    const result = await fetchAdjacentBySlug('missing-article', [])

    expect(result).toEqual({})
  })

  it('returns parsed prev/next/related when response is ok', async () => {
    const mockPayload = {
      success: true,
      data: {
        prev: { title: 'Newer Article', url: 'newer-article', date: '2026-04-01' },
        next: { title: 'Older Article', url: 'older-article', date: '2026-02-01' },
        related: [
          {
            title: 'Related',
            url: 'related-article',
            summary: 'A related post',
            date: '2026-03-15',
          },
        ],
      },
    }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockPayload), { status: 200 }))

    const result = await fetchAdjacentBySlug('my-article', ['Java'])

    expect(result.prev?.title).toBe('Newer Article')
    expect(result.prev?.date).toBe('2026-04-01')
    expect(result.next?.title).toBe('Older Article')
    expect(result.next?.date).toBe('2026-02-01')
    expect(result.related).toHaveLength(1)
    expect(result.related![0].title).toBe('Related')
    expect(result.related![0].date).toBe('2026-03-15')
  })

  it('returns empty object when response data is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    const result = await fetchAdjacentBySlug('my-article', [])

    expect(result).toEqual({})
  })

  it('appends tags as repeated query params', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }))

    await fetchAdjacentBySlug('my-article', ['Java', 'Spring'])

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain('slug=my-article')
    expect(calledUrl).toContain('tags=Java')
    expect(calledUrl).toContain('tags=Spring')
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

  it('uses raw name as slug fallback for CJK-only tag names', async () => {
    // github-slugger strips non-ASCII, so slug('技术') === '' — we fall back to the raw name
    const mockTags = [
      { name: '技术', count: 5 },
      { name: 'Spring Boot', count: 2 },
    ]
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockTags), { status: 200 }))

    const tags = await fetchPublishedTags()

    expect(tags).toHaveLength(2)
    const cjkTag = tags.find((t) => t.name === '技术')
    expect(cjkTag).toBeDefined()
    // slug must be non-empty so tag pages aren't broken
    expect(cjkTag!.slug).toBeTruthy()
    expect(cjkTag!.slug).toBe('技术')
  })

  it('derives tags from articles when tags endpoint returns non-ok', async () => {
    // First call: tags endpoint returns 500 → fall through to article-based derivation
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      // Second call: first articles page with one tagged post
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                articleId: '1',
                title: 'Post A',
                url: 'post-a',
                summary: 'S',
                coverImageUrl: null,
                viewCount: 0,
                date: '2026-01-01',
                tags: [{ tagId: 1, name: 'Java', count: 2 }],
              },
            ],
            totalCount: 1,
            pageIndex: 1,
            pageSize: 50,
            totalPage: 1,
          }),
          { status: 200 }
        )
      )

    const tags = await fetchPublishedTags()

    expect(tags).toHaveLength(1)
    expect(tags[0].name).toBe('Java')
    expect(tags[0].slug).toBeDefined()
  })
})

describe('fetchAllPublishedArticles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  function makeArticle(id: string, title: string) {
    return {
      articleId: id,
      title,
      url: title.toLowerCase(),
      summary: 'summary',
      coverImageUrl: null,
      viewCount: 0,
      date: '2026-01-01',
      tags: [],
    }
  }

  it('returns all items when there is only one page', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [makeArticle('1', 'Alpha'), makeArticle('2', 'Beta')],
          totalCount: 2,
          pageIndex: 1,
          pageSize: 50,
          totalPage: 1,
        }),
        { status: 200 }
      )
    )

    const result = await fetchAllPublishedArticles()

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Alpha')
    expect(result[1].title).toBe('Beta')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('accumulates items from multiple pages', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [makeArticle('1', 'Alpha')],
            totalCount: 2,
            pageIndex: 1,
            pageSize: 50,
            totalPage: 2,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [makeArticle('2', 'Beta')],
            totalCount: 2,
            pageIndex: 2,
            pageSize: 50,
            totalPage: 2,
          }),
          { status: 200 }
        )
      )

    const result = await fetchAllPublishedArticles()

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Alpha')
    expect(result[1].title).toBe('Beta')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('stops early when a page returns empty items even if totalPages is higher', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [],
          totalCount: 10,
          pageIndex: 1,
          pageSize: 50,
          totalPage: 5,
        }),
        { status: 200 }
      )
    )

    const result = await fetchAllPublishedArticles()

    expect(result).toHaveLength(0)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when all pages fail with network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const result = await fetchAllPublishedArticles()

    expect(result).toHaveLength(0)
  })
})

describe('fetchTopViewedArticles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  function makeArticle(id: string, title: string, viewCount: number) {
    return {
      articleId: id,
      title,
      url: title.toLowerCase().replace(/\s/g, '-'),
      summary: 'summary',
      coverImageUrl: null,
      viewCount,
      date: '2026-01-01',
      tags: [],
    }
  }

  it('returns empty array when fetch throws (network error)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const result = await fetchTopViewedArticles()

    expect(result).toEqual([])
  })

  it('returns empty array when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }))

    const result = await fetchTopViewedArticles()

    expect(result).toEqual([])
  })

  it('filters out articles with zero viewCount', async () => {
    const payload = {
      data: [makeArticle('1', 'Popular', 100), makeArticle('2', 'Zero Views', 0)],
      totalCount: 2,
      pageIndex: 1,
      pageSize: 5,
      totalPage: 1,
    }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    const result = await fetchTopViewedArticles()

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Popular')
    expect(result[0].viewCount).toBe(100)
  })

  it('returns up to pageSize items when all have non-zero viewCounts', async () => {
    const payload = {
      data: [
        makeArticle('1', 'Most', 500),
        makeArticle('2', 'Second', 200),
        makeArticle('3', 'Third', 50),
      ],
      totalCount: 3,
      pageIndex: 1,
      pageSize: 5,
      totalPage: 1,
    }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    const result = await fetchTopViewedArticles(5)

    expect(result).toHaveLength(3)
  })

  it('requests sort=views param', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ data: [], totalCount: 0, pageIndex: 1, pageSize: 5, totalPage: 1 }),
        {
          status: 200,
        }
      )
    )

    await fetchTopViewedArticles(5)

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain('sort=views')
  })

  it('returns empty array when payload data is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ data: [], totalCount: 0, pageIndex: 1, pageSize: 5, totalPage: 1 }),
        { status: 200 }
      )
    )

    const result = await fetchTopViewedArticles()

    expect(result).toEqual([])
  })
})

describe('fetchPublishedArticles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('returns items from page 1 with default page size', async () => {
    const payload = {
      data: [
        {
          articleId: '1',
          title: 'Hello',
          url: 'hello',
          summary: 'A summary',
          coverImageUrl: null,
          viewCount: 0,
          date: '2026-01-01',
          tags: [],
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: BLOG_POSTS_PER_PAGE,
      totalPage: 1,
    }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    const result = await fetchPublishedArticles()

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Hello')
    expect(result[0].slug).toBe('hello')
  })

  it('returns empty array on network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const result = await fetchPublishedArticles()

    expect(result).toEqual([])
  })

  it('accepts custom pageSize option', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ data: [], totalCount: 0, pageIndex: 1, pageSize: 10, totalPage: 1 }),
        { status: 200 }
      )
    )

    await fetchPublishedArticles({ pageSize: 10 })

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain('pageSize=10')
  })
})
