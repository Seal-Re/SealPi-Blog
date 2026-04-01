'use client'

import { usePathname } from 'next/navigation'
import { formatDate } from 'pliny/utils/formatDate'
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
            Previous
          </button>
        )}
        {prevPage && (
          <Link
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
          >
            Previous
          </Link>
        )}
        <span>
          {currentPage} of {totalPages}
        </span>
        {!nextPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            Next
          </button>
        )}
        {nextPage && (
          <Link href={`/${basePath}/page/${currentPage + 1}`} rel="next">
            Next
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
  emptyTitle = '当前还没有可展示的文章',
  emptyDescription = '内容列表暂时为空，可以稍后刷新，或从其他标签和文章入口继续浏览。',
}: ListLayoutProps) {
  const pathname = usePathname()
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts

  return (
    <>
      <div>
        <div className="pt-6 pb-6">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:hidden sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
            {title}
          </h1>
        </div>
        <div className="flex sm:space-x-24">
          <div className="hidden h-full max-h-screen max-w-[280px] min-w-[280px] flex-wrap overflow-auto rounded-sm bg-gray-50 pt-5 shadow-md sm:flex dark:bg-gray-900/70 dark:shadow-gray-800/40">
            <div className="px-6 py-4">
              {pathname.startsWith('/blog') ? (
                <h3 className="text-primary-500 font-bold uppercase">All Posts</h3>
              ) : (
                <Link
                  href="/blog"
                  className="hover:text-primary-500 dark:hover:text-primary-500 font-bold text-gray-700 uppercase dark:text-gray-300"
                >
                  All Posts
                </Link>
              )}
              <ul>
                {availableTags.map((tag) => (
                  <li key={tag.slug} className="my-3">
                    {decodeURI(pathname.split('/tags/')[1] || '').split('/page/')[0] ===
                    tag.slug ? (
                      <h3 className="text-primary-500 inline px-3 py-2 text-sm font-bold uppercase">
                        {`${tag.name} (${tag.count})`}
                      </h3>
                    ) : (
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="hover:text-primary-500 dark:hover:text-primary-500 px-3 py-2 text-sm font-medium text-gray-500 uppercase dark:text-gray-300"
                        aria-label={`View posts tagged ${tag.name}`}
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
                  <li key={post.path} className="py-5">
                    <article className="flex flex-col space-y-2 xl:space-y-0">
                      <dl>
                        <dt className="sr-only">Published on</dt>
                        <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                          <time dateTime={post.date} suppressHydrationWarning>
                            {formatDate(post.date, siteMetadata.locale)}
                          </time>
                        </dd>
                      </dl>
                      <div className="space-y-3">
                        <div>
                          <h2 className="text-2xl leading-8 font-bold tracking-tight">
                            <Link
                              href={`/${post.path}`}
                              className="text-gray-900 dark:text-gray-100"
                            >
                              {post.title}
                            </Link>
                          </h2>
                          <div className="flex flex-wrap">
                            {post.tags.map((tagName) => (
                              <Tag key={tagName} text={tagName} />
                            ))}
                          </div>
                        </div>
                        <div className="prose max-w-none text-gray-500 dark:text-gray-400">
                          {post.summary}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-gray-300 bg-gray-50/80 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                <h2 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
                  {emptyTitle}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                  {emptyDescription}
                </p>
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
