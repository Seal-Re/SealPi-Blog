import ListLayout from '@/layouts/ListLayoutWithTags'
import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { genPageMetadata } from 'app/seo'
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedArticlesPage,
  fetchPublishedTags,
} from '@/lib/public-blog-api'

function normalizeTagLabel(tag: string) {
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}

export async function generateMetadata(props: {
  params: Promise<{ tag: string; page: string }>
}): Promise<Metadata> {
  const params = await props.params
  const tagSlug = decodeURI(params.tag)
  const pageNumber = parseInt(params.page, 10)
  const availableTags = await fetchPublishedTags()
  const currentTag = availableTags.find((item) => item.slug === tagSlug)
  const tagName = currentTag?.name || tagSlug.replace(/-/g, ' ')

  return genPageMetadata({
    title: `${tagName} — 第 ${pageNumber} 页`,
    description: `${siteMetadata.title} — 标签「${tagName}」第 ${pageNumber} 页`,
    alternates: {
      canonical: `${siteMetadata.siteUrl}/tags/${tagSlug}/page/${pageNumber}`,
      types: {
        'application/rss+xml': `${siteMetadata.siteUrl}/tags/${tagSlug}/feed.xml`,
      },
    },
  })
}

export const dynamicParams = true
export const revalidate = 300

export const generateStaticParams = async () => {
  const tags = await fetchPublishedTags()

  return tags.flatMap((tag) => {
    const totalPages = Math.max(1, Math.ceil(tag.count / BLOG_POSTS_PER_PAGE))
    return Array.from({ length: totalPages }, (_, index) => ({
      tag: encodeURI(tag.slug),
      page: String(index + 1),
    }))
  })
}

export default async function TagPage(props: { params: Promise<{ tag: string; page: string }> }) {
  const params = await props.params
  const tagSlug = decodeURI(params.tag)
  const pageNumber = parseInt(params.page, 10)

  if (pageNumber <= 0 || Number.isNaN(pageNumber)) {
    return notFound()
  }

  const availableTags = await fetchPublishedTags()
  const hasTagCatalog = availableTags.length > 0
  const currentTag = availableTags.find((item) => item.slug === tagSlug)

  if (hasTagCatalog && !currentTag) {
    return notFound()
  }

  const fallbackTagName = tagSlug.replace(/-/g, ' ')
  const response = await fetchPublishedArticlesPage(
    pageNumber,
    BLOG_POSTS_PER_PAGE,
    currentTag?.name || fallbackTagName
  )

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
      title={normalizeTagLabel(currentTag?.name || fallbackTagName)}
      eyebrow="标签"
      availableTags={availableTags}
      emptyTitle={hasTagCatalog ? '该分页下暂时没有文章' : '标签数据暂不可用'}
      emptyDescription={
        hasTagCatalog
          ? '可能是标签文章数量刚发生变化，或当前分页已无数据；可以返回第一页继续查看。'
          : '暂时无法加载标签总表，已回退为按当前标签名请求分页；可稍后刷新重试。'
      }
    />
  )
}
