import { Suspense } from 'react'
import Main from './Main'
import siteMetadata from '@/data/siteMetadata'
import {
  BLOG_POSTS_PER_PAGE,
  PUBLIC_FETCH_REVALIDATE_SECONDS,
  fetchPublishedArticles,
} from '@/lib/public-blog-api'

export const revalidate = PUBLIC_FETCH_REVALIDATE_SECONDS

async function ArticleFeed() {
  const posts = await fetchPublishedArticles({ pageSize: BLOG_POSTS_PER_PAGE })
  return <Main posts={posts} />
}

function ArticleFeedSkeleton() {
  return (
    <ul className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="border-wb-rule-soft bg-wb-canvas animate-pulse overflow-hidden rounded-2xl border dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="bg-wb-paper h-52 w-full dark:bg-gray-900" />
          <div className="space-y-3 p-6">
            <div className="bg-wb-paper h-3 w-24 rounded dark:bg-gray-900" />
            <div className="bg-wb-paper h-5 w-3/4 rounded dark:bg-gray-900" />
            <div className="bg-wb-paper h-3 w-full rounded dark:bg-gray-900" />
            <div className="bg-wb-paper h-3 w-2/3 rounded dark:bg-gray-900" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <>
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="font-fraunces text-wb-ink text-3xl font-medium tracking-tight italic sm:text-4xl md:text-6xl dark:text-gray-100">
          最新文章
        </h1>
        <p className="text-wb-meta text-lg leading-7 dark:text-gray-400">
          {siteMetadata.description}
        </p>
      </div>
      <Suspense fallback={<ArticleFeedSkeleton />}>
        <ArticleFeed />
      </Suspense>
    </>
  )
}
