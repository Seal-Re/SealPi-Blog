import siteMetadata from '@/data/siteMetadata'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { genPageMetadata } from 'app/seo'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedArticlesForStaticPaths,
  fetchPublishedArticlesPage,
} from '@/lib/public-blog-api'

function normalizeTagLabel(tag: string) {
  return tag[0].toUpperCase() + tag.split(' ').join('-').slice(1)
}

export async function generateMetadata(props: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const params = await props.params
  const tag = decodeURI(params.tag)
  return genPageMetadata({
    title: tag,
    description: `${siteMetadata.title} ${tag} tagged content`,
    alternates: {
      canonical: './',
      types: {
        'application/rss+xml': `${siteMetadata.siteUrl}/tags/${tag}/feed.xml`,
      },
    },
  })
}

export const dynamicParams = true

export const generateStaticParams = async () => {
  const posts = await fetchPublishedArticlesForStaticPaths()
  const tags = new Set<string>()
  posts.forEach((post) => {
    post.tags.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).map((tag) => ({ tag: encodeURI(tag) }))
}

export default async function TagPage(props: { params: Promise<{ tag: string }> }) {
  const params = await props.params
  const tag = decodeURI(params.tag)
  const title = normalizeTagLabel(tag)
  const response = await fetchPublishedArticlesPage(1, 100)
  const filteredPosts = response.items.filter((post) => post.tags.some((item) => item === tag))

  if (!filteredPosts.length) {
    return notFound()
  }

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / BLOG_POSTS_PER_PAGE))
  const initialDisplayPosts = filteredPosts.slice(0, BLOG_POSTS_PER_PAGE)

  return (
    <ListLayout
      posts={filteredPosts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={{
        currentPage: 1,
        totalPages,
      }}
      title={title}
    />
  )
}
