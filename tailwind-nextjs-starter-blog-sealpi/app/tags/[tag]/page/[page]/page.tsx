import ListLayout from '@/layouts/ListLayoutWithTags'
import { notFound } from 'next/navigation'
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedArticlesForStaticPaths,
  fetchPublishedArticlesPage,
} from '@/lib/public-blog-api'

function normalizeTagLabel(tag: string) {
  return tag[0].toUpperCase() + tag.split(' ').join('-').slice(1)
}

export const dynamicParams = true

export const generateStaticParams = async () => {
  const posts = await fetchPublishedArticlesForStaticPaths()
  const counts = new Map<string, number>()

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    })
  })

  return Array.from(counts.entries()).flatMap(([tag, count]) => {
    const totalPages = Math.max(1, Math.ceil(count / BLOG_POSTS_PER_PAGE))
    return Array.from({ length: totalPages }, (_, index) => ({
      tag: encodeURI(tag),
      page: String(index + 1),
    }))
  })
}

export default async function TagPage(props: { params: Promise<{ tag: string; page: string }> }) {
  const params = await props.params
  const tag = decodeURI(params.tag)
  const title = normalizeTagLabel(tag)
  const pageNumber = parseInt(params.page, 10)

  if (pageNumber <= 0 || Number.isNaN(pageNumber)) {
    return notFound()
  }

  const response = await fetchPublishedArticlesPage(1, 100)
  const filteredPosts = response.items.filter((post) => post.tags.some((item) => item === tag))
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / BLOG_POSTS_PER_PAGE))

  if (!filteredPosts.length || pageNumber > totalPages) {
    return notFound()
  }

  const initialDisplayPosts = filteredPosts.slice(
    BLOG_POSTS_PER_PAGE * (pageNumber - 1),
    BLOG_POSTS_PER_PAGE * pageNumber
  )

  return (
    <ListLayout
      posts={filteredPosts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={{
        currentPage: pageNumber,
        totalPages,
      }}
      title={title}
    />
  )
}
