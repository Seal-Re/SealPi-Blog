import { genPageMetadata } from 'app/seo'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { BLOG_POSTS_PER_PAGE, fetchPublishedArticlesPage } from '@/lib/public-blog-api'

export const metadata = genPageMetadata({ title: 'Blog' })

export default async function BlogPage() {
  const response = await fetchPublishedArticlesPage(1, BLOG_POSTS_PER_PAGE)

  return (
    <ListLayout
      posts={response.items}
      initialDisplayPosts={response.items}
      pagination={{
        currentPage: response.pageIndex,
        totalPages: response.totalPages,
      }}
      title="All Posts"
    />
  )
}
