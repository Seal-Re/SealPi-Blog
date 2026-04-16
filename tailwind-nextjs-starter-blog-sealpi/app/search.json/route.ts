import { fetchAllPublishedArticles } from '@/lib/public-blog-api'
import { NextResponse } from 'next/server'

export const revalidate = 300 // 5-minute ISR cache

/**
 * Serves the kbar search index from backend articles.
 * Overrides the static public/search.json file.
 * Format mirrors contentlayer's allCoreContent output so pliny/kbar works unchanged.
 */
export async function GET() {
  const articles = await fetchAllPublishedArticles()

  const documents = articles.map((post) => ({
    title: post.title,
    date: post.date,
    summary: post.summary,
    tags: post.tags,
    path: post.path,
    slug: post.slug,
  }))

  return NextResponse.json(documents, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
