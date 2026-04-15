import { slug } from 'github-slugger'
import Link from 'next/link'

type WbMetaProps = {
  date: string
  readMinutes?: number
  viewCount?: number
  tags?: string[]
}

export default function WbMeta({ date, readMinutes, viewCount, tags = [] }: WbMetaProps) {
  return (
    <div className="font-inter text-wb-meta mb-7 flex flex-wrap items-center gap-3.5 text-[13px]">
      <span>{date}</span>
      {readMinutes != null ? (
        <>
          <span className="opacity-40">·</span>
          <span>{readMinutes} min read</span>
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
          href={`/tags/${slug(tag)}`}
          className="border-wb-rule text-wb-meta font-geist-mono hover:border-wb-accent hover:text-wb-accent rounded border px-2.5 py-0.5 text-[11.5px] transition-colors"
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}
