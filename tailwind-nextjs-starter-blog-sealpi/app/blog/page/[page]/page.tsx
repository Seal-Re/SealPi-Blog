import ListLayout from '@/layouts/ListLayoutWithTags'
import { notFound } from 'next/navigation'
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedArticlesForStaticPaths,
  fetchPublishedArticlesPage,
  fetchPublishedTags,
} from '@/lib/public-blog-api'

export const dynamicParams = true

export const generateStaticParams = async () => {
  const allPosts = await fetchPublishedArticlesForStaticPaths()
  const totalPages = Math.max(1, Math.ceil(allPosts.length / BLOG_POSTS_PER_PAGE))
  return Array.from({ length: totalPages }, (_, i) => ({ page: String(i + 1) }))
}

export default async function Page(props: { params: Promise<{ page: string }> }) {
  const params = await props.params
  const pageNumber = parseInt(params.page as string, 10)

  if (pageNumber <= 0 || Number.isNaN(pageNumber)) {
    return notFound()
  }

  const [response, availableTags] = await Promise.all([
    fetchPublishedArticlesPage(pageNumber, BLOG_POSTS_PER_PAGE),
    fetchPublishedTags(),
  ])

  if (pageNumber > response.totalPages) {
    return notFound()
  }

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
