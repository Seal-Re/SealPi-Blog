import { Suspense } from 'react'
import Link from '@/components/Link'
import Main from './Main'
import siteMetadata from '@/data/siteMetadata'
import { BLOG_POSTS_PER_PAGE, fetchPublishedArticles } from '@/lib/public-blog-api'

export const revalidate = 300

async function ArticleFeed() {
  const posts = await fetchPublishedArticles({ pageSize: BLOG_POSTS_PER_PAGE })
  return <Main posts={posts} />
}

function ArticleFeedSkeleton() {
  return (
    <ul className="space-y-6">
      {Array.from({ length: BLOG_POSTS_PER_PAGE }).map((_, i) => (
        <li
          key={i}
          className="border-wb-rule-soft bg-wb-canvas animate-pulse overflow-hidden rounded-2xl border"
        >
          <div className="bg-wb-paper h-52 w-full" />
          <div className="space-y-3 p-6">
            <div className="bg-wb-paper h-3 w-24 rounded" />
            <div className="bg-wb-paper h-5 w-3/4 rounded" />
            <div className="bg-wb-paper h-3 w-full rounded" />
            <div className="bg-wb-paper h-3 w-2/3 rounded" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <>
      {/* Hero */}
      <div className="border-wb-rule-soft border-b pt-10 pb-12 md:pt-14">
        <p className="font-inter text-wb-accent mb-4 text-[11px] font-semibold tracking-[0.26em] uppercase">
          随笔 · 技术 · 日常
        </p>
        <h1 className="font-fraunces text-wb-ink text-[44px] leading-[1.06] font-medium tracking-tight italic sm:text-6xl md:text-[76px]">
          {siteMetadata.headerTitle}
        </h1>
        <p className="text-wb-meta mt-5 max-w-[440px] text-base leading-7 sm:text-lg">
          {siteMetadata.description}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/blog"
            className="bg-wb-ink text-wb-paper hover:bg-wb-accent rounded-full px-6 py-2.5 text-sm font-semibold transition-colors duration-200"
          >
            浏览全部文章
          </Link>
          <Link
            href="/about"
            className="border-wb-rule text-wb-meta hover:border-wb-accent hover:text-wb-accent rounded-full border px-6 py-2.5 text-sm font-medium transition-colors duration-200"
          >
            关于我
          </Link>
        </div>
      </div>

      {/* Section label */}
      <div className="mt-10 mb-6 flex items-center gap-4">
        <p className="font-inter text-wb-meta shrink-0 text-[11px] font-semibold tracking-[0.22em] uppercase">
          最新文章
        </p>
        <div className="border-wb-rule-soft flex-1 border-t" />
      </div>

      <Suspense fallback={<ArticleFeedSkeleton />}>
        <ArticleFeed />
      </Suspense>
    </>
  )
}
