import Link from '@/components/Link'
import Tag from '@/components/Tag'
import { formatDate } from 'pliny/utils/formatDate'
import Image from 'next/image'
import siteMetadata from '@/data/siteMetadata'
import type { PublicBlogPost } from '@/lib/public-blog-api'

export default function Home({ posts }: { posts: PublicBlogPost[] }) {
  return (
    <>
      <ul className="space-y-6">
        {!posts.length && (
          <li className="bg-wb-canvas border-wb-rule-soft rounded-2xl border p-10 text-center">
            <p className="text-wb-meta text-sm">暂无已发布文章</p>
          </li>
        )}
        {posts.map((post) => {
          const { slug, date, lastmod, title, summary, tags, coverImageUrl, viewCount } = post
          const isUpdated = lastmod && lastmod.substring(0, 10) !== date.substring(0, 10)
          return (
            <li key={slug}>
              <article className="bg-wb-canvas border-wb-rule-soft group overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
                {coverImageUrl ? (
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src={coverImageUrl}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 1280px) 100vw, 60vw"
                    />
                  </div>
                ) : (
                  <div className="from-wb-accent/30 via-wb-rule/40 h-1 w-full bg-gradient-to-r to-transparent" />
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <time dateTime={date} className="text-wb-meta text-sm font-medium">
                      {formatDate(date, siteMetadata.locale)}
                    </time>
                    {isUpdated ? (
                      <span className="border-wb-rule-soft font-inter text-wb-meta rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-[0.10em] uppercase opacity-75">
                        已更新
                      </span>
                    ) : null}
                    {viewCount != null && viewCount > 0 ? (
                      <>
                        <span className="text-wb-rule opacity-40">·</span>
                        <span className="text-wb-meta text-xs">
                          {viewCount.toLocaleString('zh-CN')} 次阅读
                        </span>
                      </>
                    ) : null}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    )}
                  </div>
                  <h2 className="font-fraunces text-wb-ink mt-3 text-[22px] leading-snug font-semibold tracking-tight italic">
                    <Link
                      href={`/blog/${slug}`}
                      className="hover:text-wb-accent transition-colors duration-200"
                    >
                      {title}
                    </Link>
                  </h2>
                  <p className="text-wb-meta mt-3 line-clamp-3 text-sm leading-7">{summary}</p>
                  <div className="mt-4">
                    <Link
                      href={`/blog/${slug}`}
                      className="text-wb-accent hover:text-wb-ink text-sm font-medium transition-colors duration-200"
                      aria-label={`阅读全文：${title}`}
                    >
                      阅读全文 &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>

      {posts.length > 0 && (
        <div className="mt-6 flex justify-end text-base leading-6 font-medium">
          <Link
            href="/blog"
            className="text-wb-accent hover:text-wb-ink transition-colors duration-200"
            aria-label="查看全部文章"
          >
            查看全部文章 &rarr;
          </Link>
        </div>
      )}
    </>
  )
}
