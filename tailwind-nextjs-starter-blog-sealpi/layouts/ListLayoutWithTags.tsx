'use client'

import { usePathname } from 'next/navigation'
import { formatDate } from 'pliny/utils/formatDate'
import Image from 'next/image'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import type { PublicBlogPost, PublicTag } from '@/lib/public-blog-api'

interface PaginationProps {
  totalPages: number
  currentPage: number
}

interface ListLayoutProps {
  posts: PublicBlogPost[]
  title: string
  initialDisplayPosts?: PublicBlogPost[]
  pagination?: PaginationProps
  availableTags?: PublicTag[]
  emptyTitle?: string
  emptyDescription?: string
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const basePath = pathname
    .replace(/^\//, '')
    .replace(/\/page\/\d+\/?$/, '')
    .replace(/\/$/, '')
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  return (
    <nav className="mt-8 flex items-center justify-between">
      {prevPage ? (
        <Link
          href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
          rel="prev"
          className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200"
        >
          <span aria-hidden="true">←</span> 上一页
        </Link>
      ) : (
        <span className="border-wb-rule-soft text-wb-rule inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium opacity-40 select-none">
          <span aria-hidden="true">←</span> 上一页
        </span>
      )}
      <span className="text-wb-meta text-sm">
        第 {currentPage} / {totalPages} 页
      </span>
      {nextPage ? (
        <Link
          href={`/${basePath}/page/${currentPage + 1}`}
          rel="next"
          className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200"
        >
          下一页 <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="border-wb-rule-soft text-wb-rule inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium opacity-40 select-none">
          下一页 <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  )
}

export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
  availableTags = [],
  emptyTitle = '暂无文章',
  emptyDescription = '',
}: ListLayoutProps) {
  const pathname = usePathname()
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts

  return (
    <>
      <div>
        <div className="pt-6 pb-4">
          <h1 className="font-fraunces text-wb-ink text-3xl font-medium tracking-tight italic sm:hidden">
            {title}
          </h1>
        </div>
        {availableTags.length > 0 && (
          <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 sm:hidden">
            <Link
              href="/blog"
              className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap uppercase transition-colors ${
                pathname.startsWith('/blog') && !pathname.includes('/tags/')
                  ? 'border-wb-accent bg-wb-accent/10 text-wb-accent'
                  : 'border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent'
              }`}
            >
              全部
            </Link>
            {availableTags.map((tag) => {
              const isActive =
                decodeURI(pathname.split('/tags/')[1] || '').split('/page/')[0] === tag.slug
              return (
                <Link
                  key={tag.slug}
                  href={`/tags/${tag.slug}`}
                  aria-label={`查看标签：${tag.name}`}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap uppercase transition-colors ${
                    isActive
                      ? 'border-wb-accent bg-wb-accent/10 text-wb-accent'
                      : 'border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent'
                  }`}
                >
                  {tag.name}
                </Link>
              )
            })}
          </div>
        )}
        <div className="flex sm:space-x-24">
          <div className="border-wb-rule-soft bg-wb-paper hidden h-full max-h-screen max-w-[280px] min-w-[280px] flex-wrap overflow-auto rounded-2xl border pt-5 shadow-[0_4px_20px_-6px_rgba(31,26,21,0.10)] sm:flex dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.35)]">
            <div className="px-4 py-4">
              {pathname.startsWith('/blog') ? (
                <span className="bg-wb-accent/10 text-wb-accent inline-block w-full rounded-lg px-3 py-2 text-sm font-bold uppercase">
                  全部文章
                </span>
              ) : (
                <Link
                  href="/blog"
                  className="hover:text-wb-accent hover:bg-wb-accent/5 text-wb-meta inline-block w-full rounded-lg px-3 py-2 text-sm font-medium uppercase transition-colors duration-200"
                >
                  全部文章
                </Link>
              )}
              <ul>
                {availableTags.map((tag) => (
                  <li key={tag.slug} className="mt-1">
                    {decodeURI(pathname.split('/tags/')[1] || '').split('/page/')[0] ===
                    tag.slug ? (
                      <span className="bg-wb-accent/10 text-wb-accent inline-block w-full rounded-lg px-3 py-2 text-sm font-bold uppercase">
                        {`${tag.name} (${tag.count})`}
                      </span>
                    ) : (
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="hover:text-wb-accent hover:bg-wb-accent/5 text-wb-meta inline-block w-full rounded-lg px-3 py-2 text-sm font-medium uppercase transition-colors duration-200"
                        aria-label={`查看标签：${tag.name}`}
                      >
                        {`${tag.name} (${tag.count})`}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            {displayPosts.length ? (
              <ul>
                {displayPosts.map((post) => (
                  <li key={post.path} className="py-3">
                    <article className="bg-wb-canvas border-wb-rule-soft group overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
                      {post.coverImageUrl ? (
                        <div className="relative h-48 w-full overflow-hidden">
                          <Image
                            src={post.coverImageUrl}
                            alt={`${post.title} cover`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 1280px) 100vw, 60vw"
                          />
                        </div>
                      ) : (
                        <div className="from-wb-accent/30 via-wb-rule/40 h-1 w-full bg-gradient-to-r to-transparent" />
                      )}
                      <div className="p-5">
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          <time
                            dateTime={post.date}
                            className="text-wb-meta text-sm font-medium"
                            suppressHydrationWarning
                          >
                            {formatDate(post.date, siteMetadata.locale)}
                          </time>
                          {post.viewCount != null && post.viewCount > 0 ? (
                            <span className="text-wb-meta text-xs">
                              {post.viewCount.toLocaleString('zh-CN')} 次阅读
                            </span>
                          ) : null}
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.tags.map((tagName) => (
                                <Tag key={tagName} text={tagName} />
                              ))}
                            </div>
                          )}
                        </div>
                        <h2 className="text-wb-ink text-xl font-bold tracking-tight">
                          <Link
                            href={`/${post.path}`}
                            className="hover:text-wb-accent transition-colors duration-200"
                          >
                            {post.title}
                          </Link>
                        </h2>
                        <p className="text-wb-meta mt-2 line-clamp-2 text-sm leading-6">
                          {post.summary}
                        </p>
                        <div className="mt-3">
                          <Link
                            href={`/${post.path}`}
                            className="text-wb-accent hover:text-wb-ink text-sm font-medium transition-colors duration-200"
                            aria-label={`阅读全文：${post.title}`}
                          >
                            阅读全文 &rarr;
                          </Link>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-wb-rule bg-wb-paper/80 rounded-[2rem] border border-dashed px-6 py-12 text-center">
                <h2 className="text-wb-ink text-2xl font-bold tracking-tight">{emptyTitle}</h2>
                {emptyDescription ? (
                  <p className="text-wb-meta mx-auto mt-4 max-w-2xl text-sm leading-7">
                    {emptyDescription}
                  </p>
                ) : null}
              </div>
            )}
            {pagination && pagination.totalPages > 1 && (
              <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
