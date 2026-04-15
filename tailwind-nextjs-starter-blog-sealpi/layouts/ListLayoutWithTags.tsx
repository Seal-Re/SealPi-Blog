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
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <nav className="flex justify-between">
        {!prevPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
            上一页
          </button>
        )}
        {prevPage && (
          <Link
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
          >
            上一页
          </Link>
        )}
        <span>
          第 {currentPage} / {totalPages} 页
        </span>
        {!nextPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            下一页
          </button>
        )}
        {nextPage && (
          <Link href={`/${basePath}/page/${currentPage + 1}`} rel="next">
            下一页
          </Link>
        )}
      </nav>
    </div>
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
          <h1 className="font-fraunces text-wb-ink text-3xl font-medium tracking-tight italic sm:hidden sm:text-4xl md:text-6xl">
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
          <div className="bg-wb-paper hidden h-full max-h-screen max-w-[280px] min-w-[280px] flex-wrap overflow-auto rounded-sm pt-5 shadow-md sm:flex">
            <div className="px-6 py-4">
              {pathname.startsWith('/blog') ? (
                <h3 className="text-wb-accent font-bold uppercase">全部文章</h3>
              ) : (
                <Link
                  href="/blog"
                  className="hover:text-wb-accent text-wb-meta font-bold uppercase transition-colors duration-200"
                >
                  全部文章
                </Link>
              )}
              <ul>
                {availableTags.map((tag) => (
                  <li key={tag.slug} className="my-3">
                    {decodeURI(pathname.split('/tags/')[1] || '').split('/page/')[0] ===
                    tag.slug ? (
                      <h3 className="text-wb-accent inline px-3 py-2 text-sm font-bold uppercase">
                        {`${tag.name} (${tag.count})`}
                      </h3>
                    ) : (
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="hover:text-wb-accent text-wb-meta px-3 py-2 text-sm font-medium uppercase transition-colors duration-200"
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
                      ) : null}
                      <div className="p-5">
                        <dl>
                          <dt className="sr-only">发布于</dt>
                          <dd className="text-wb-meta mb-2 text-sm font-medium">
                            <time dateTime={post.date} suppressHydrationWarning>
                              {formatDate(post.date, siteMetadata.locale)}
                            </time>
                          </dd>
                        </dl>
                        <h2 className="text-wb-ink text-xl font-bold tracking-tight">
                          <Link
                            href={`/${post.path}`}
                            className="hover:text-wb-accent transition-colors duration-200"
                          >
                            {post.title}
                          </Link>
                        </h2>
                        <div className="mt-1 flex flex-wrap">
                          {post.tags.map((tagName) => (
                            <Tag key={tagName} text={tagName} />
                          ))}
                        </div>
                        <p className="text-wb-meta mt-2 line-clamp-2 text-sm leading-6">
                          {post.summary}
                        </p>
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
