import { genPageMetadata } from 'app/seo'
import ListLayout from '@/layouts/ListLayoutWithTags'
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedArticlesPage,
  fetchPublishedTags,
} from '@/lib/public-blog-api'

export const metadata = genPageMetadata({ title: '文章' })
export const revalidate = 300

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
      title="全部文章"
      availableTags={availableTags}
    />
  )
}
