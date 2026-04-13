import { genPageMetadata } from 'app/seo'
import ListLayout from '@/layouts/ListLayoutWithTags'
import {
  BLOG_POSTS_PER_PAGE,
  PUBLIC_FETCH_REVALIDATE_SECONDS,
  fetchPublishedArticlesPage,
  fetchPublishedTags,
} from '@/lib/public-blog-api'

export const metadata = genPageMetadata({ title: 'Blog' })
export const revalidate = PUBLIC_FETCH_REVALIDATE_SECONDS

export default async function BlogPage() {
  const [response, availableTags] = await Promise.all([
    fetchPublishedArticlesPage(1, BLOG_POSTS_PER_PAGE),
    fetchPublishedTags(),
  ])

  return (
    <ListLayout
      posts={response.items}
      initialDisplayPosts={response.items}
      pagination={{
        currentPage: response.pageIndex,
        totalPages: response.totalPages,
      }}
      title="All Posts"
      availableTags={availableTags}
    />
  )
}
