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
          className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="h-52 w-full bg-gray-100 dark:bg-gray-900" />
          <div className="space-y-3 p-6">
            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-900" />
            <div className="h-5 w-3/4 rounded bg-gray-100 dark:bg-gray-900" />
            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-900" />
            <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-900" />
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
        <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
          最新文章
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          {siteMetadata.description}
        </p>
      </div>
      <Suspense fallback={<ArticleFeedSkeleton />}>
        <ArticleFeed />
      </Suspense>
    </>
  )
}
