import { slug } from 'github-slugger'
import Link from 'next/link'

type WbMetaProps = {
  /** ISO 8601 date string (e.g. "2026-04-16T00:00:00.000Z"). Formatted to zh-CN locale internally. */
  dateIso: string
  /** ISO 8601 lastmod string. Only shown when it falls on a different calendar day than dateIso. */
  lastmodIso?: string
  readMinutes?: number
  viewCount?: number
  tags?: string[]
}

function formatZhCN(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function WbMeta({
  dateIso,
  lastmodIso,
  readMinutes,
  viewCount,
  tags = [],
}: WbMetaProps) {
  const showLastmod = lastmodIso != null && lastmodIso.substring(0, 10) !== dateIso.substring(0, 10)

  return (
    <div className="font-inter text-wb-meta mb-7 flex flex-wrap items-center gap-3.5 text-[13px]">
      <time dateTime={dateIso}>{formatZhCN(dateIso)}</time>
      {showLastmod ? (
        <>
          <span className="opacity-40">·</span>
          <time dateTime={lastmodIso} className="text-[12px] opacity-70">
            更新于 {formatZhCN(lastmodIso!)}
          </time>
        </>
      ) : null}
      {readMinutes != null ? (
        <>
          <span className="opacity-40">·</span>
          <span>{readMinutes} 分钟阅读</span>
        </>
      ) : null}
      {viewCount != null && viewCount > 0 ? (
        <>
          <span className="opacity-40">·</span>
          <span>{viewCount.toLocaleString('zh-CN')} 次阅读</span>
        </>
      ) : null}
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/tags/${slug(tag) || tag}`}
          className="border-wb-rule-soft text-wb-meta font-geist-mono hover:border-wb-accent hover:bg-wb-accent/5 hover:text-wb-accent focus-visible:ring-wb-accent rounded border px-2 py-0.5 text-[11px] transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none"
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}
