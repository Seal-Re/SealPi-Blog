import { slug } from 'github-slugger'
import Link from 'next/link'

type WbMetaProps = {
  date: string
  lastmod?: string
  readMinutes?: number
  viewCount?: number
  tags?: string[]
}

export default function WbMeta({ date, lastmod, readMinutes, viewCount, tags = [] }: WbMetaProps) {
  return (
    <div className="font-inter text-wb-meta mb-7 flex flex-wrap items-center gap-3.5 text-[13px]">
      <span>{date}</span>
      {lastmod ? (
        <>
          <span className="opacity-40">·</span>
          <span className="text-[12px] opacity-70">更新于 {lastmod}</span>
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
          className="border-wb-rule-soft text-wb-meta font-geist-mono hover:border-wb-accent hover:text-wb-accent rounded border px-2 py-0.5 text-[11px] transition-colors duration-200"
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}
