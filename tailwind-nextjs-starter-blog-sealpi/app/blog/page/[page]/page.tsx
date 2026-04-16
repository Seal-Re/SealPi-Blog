import ListLayout from '@/layouts/ListLayoutWithTags'
import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { genPageMetadata } from 'app/seo'
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedArticlesForStaticPaths,
  fetchPublishedArticlesPage,
  fetchPublishedTags,
} from '@/lib/public-blog-api'

export async function generateMetadata(props: {
  params: Promise<{ page: string }>
}): Promise<Metadata> {
  const params = await props.params
  const pageNumber = parseInt(params.page, 10)
  return genPageMetadata({
    title: `文章 — 第 ${pageNumber} 页`,
    description: `${siteMetadata.title} 文章列表第 ${pageNumber} 页`,
    alternates: {
      canonical: `${siteMetadata.siteUrl}/blog/page/${pageNumber}`,
    },
  })
}

export const dynamicParams = true
export const revalidate = 300

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
      title="全部文章"
      eyebrow="随笔 · 技术"
      availableTags={availableTags}
      totalCount={response.totalCount}
    />
  )
}
