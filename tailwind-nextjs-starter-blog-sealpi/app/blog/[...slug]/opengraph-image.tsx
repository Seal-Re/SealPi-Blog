import { ImageResponse } from 'next/og'
import siteMetadata from '@/data/siteMetadata'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function fetchArticleForOg(
  slug: string
): Promise<{ title: string; tags: string[]; coverImageUrl?: string } | null> {
  try {
    const res = await fetch(buildApiUrl(`/api/v1/articles/slug/${encodeURIComponent(slug)}`), {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const payload = (await res.json()) as ApiResult<AdminArticle>
    const article = payload.data
    if (!article) return null
    return {
      title: article.title || siteMetadata.title,
      tags: article.tags?.map((t) => t.name).filter(Boolean) as string[],
      coverImageUrl: article.coverImageUrl,
    }
  } catch {
    return null
  }
}

export default async function ArticleOgImage(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const article = await fetchArticleForOg(slug)

  const title = article?.title ?? siteMetadata.title
  const firstTag = article?.tags?.[0]

  // Estimate visual character width: CJK characters are roughly 2× the width of ASCII.
  // This gives a more accurate threshold for font-size scaling in mixed-language titles.
  const effectiveLength = [...title].reduce(
    (acc, ch) => acc + (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/.test(ch) ? 2 : 1),
    0
  )
  const titleFontSize = effectiveLength > 60 ? 48 : effectiveLength > 36 ? 60 : effectiveLength > 22 ? 72 : 84

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        background: '#fdf6ef',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Warm texture overlay — subtle radial gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 60% at 10% 80%, rgba(196,155,92,0.14) 0%, transparent 70%)',
        }}
      />

      {/* Left amber accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          background: 'linear-gradient(180deg, #c49b5c 0%, #a07840 100%)',
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          left: 32,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px 60px 64px',
        }}
      >
        {/* Top: tag label */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {firstTag ? (
            <div
              style={{
                background: 'rgba(196,155,92,0.15)',
                border: '1px solid rgba(196,155,92,0.35)',
                borderRadius: 100,
                padding: '8px 20px',
                fontSize: 18,
                fontFamily: 'serif',
                color: '#a07840',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {firstTag}
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}
        </div>

        {/* Middle: article title */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            paddingTop: 32,
            paddingBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: titleFontSize,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontWeight: 600,
              color: '#1f1a15',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              maxWidth: 900,
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: site attribution */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontFamily: 'Georgia, serif',
              color: '#8a7560',
              letterSpacing: '0.01em',
            }}
          >
            {siteMetadata.author} · {siteMetadata.title}
          </div>
          <div
            style={{
              fontSize: 20,
              fontFamily: 'monospace',
              color: '#c49b5c',
              letterSpacing: '0.05em',
            }}
          >
            {siteMetadata.siteUrl.replace('https://', '')}
          </div>
        </div>
      </div>

      {/* Decorative corner mark */}
      <div
        style={{
          position: 'absolute',
          bottom: 52,
          right: 64,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '2px solid rgba(196,155,92,0.3)',
        }}
      />
    </div>,
    {
      ...size,
    }
  )
}
