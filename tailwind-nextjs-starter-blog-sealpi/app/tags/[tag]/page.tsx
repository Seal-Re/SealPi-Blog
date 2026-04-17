import siteMetadata from '@/data/siteMetadata'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { genPageMetadata } from 'app/seo'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedArticlesPage,
  fetchPublishedTags,
} from '@/lib/public-blog-api'

function normalizeTagLabel(tag: string) {
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}

function buildEmptyStateProps() {
  return {
    emptyTitle: '该标签下暂时还没有文章',
    emptyDescription:
      '标签数据已从后端同步完成，但当前分页结果为空，可稍后重试或返回标签列表查看其他内容。',
  }
}

export async function generateMetadata(props: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const params = await props.params
  const tagSlug = decodeURI(params.tag)
  const availableTags = await fetchPublishedTags()
  const currentTag = availableTags.find((item) => item.slug === tagSlug)
  const tag = currentTag?.name || tagSlug

  return genPageMetadata({
    title: tag,
    description: `${siteMetadata.title} — 标签「${tag}」相关文章`,
    alternates: {
      canonical: `${siteMetadata.siteUrl}/tags/${tagSlug}`,
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
  return tags.map((tag) => ({ tag: encodeURI(tag.slug) }))
}

export default async function TagPage(props: { params: Promise<{ tag: string }> }) {
  const params = await props.params
  const tagSlug = decodeURI(params.tag)
  const availableTags = await fetchPublishedTags()
  const hasTagCatalog = availableTags.length > 0
  const currentTag = availableTags.find((item) => item.slug === tagSlug)

  if (hasTagCatalog && !currentTag) {
    return notFound()
  }

  const fallbackTagName = tagSlug.replace(/-/g, ' ')
  const tagName = normalizeTagLabel(currentTag?.name || fallbackTagName)
  const response = await fetchPublishedArticlesPage(
    1,
    BLOG_POSTS_PER_PAGE,
    currentTag?.name || fallbackTagName
  )

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteMetadata.title, item: siteMetadata.siteUrl },
      { '@type': 'ListItem', position: 2, name: '标签', item: `${siteMetadata.siteUrl}/tags` },
      {
        '@type': 'ListItem',
        position: 3,
        name: tagName,
        item: `${siteMetadata.siteUrl}/tags/${tagSlug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ListLayout
        posts={response.items}
        initialDisplayPosts={response.items}
        pagination={{
          currentPage: response.pageIndex,
          totalPages: response.totalPages,
        }}
        title={tagName}
        eyebrow="标签"
        eyebrowHref="/tags"
        availableTags={availableTags}
        totalCount={response.totalCount}
        emptyTitle={hasTagCatalog ? buildEmptyStateProps().emptyTitle : '标签数据暂不可用'}
        emptyDescription={
          hasTagCatalog
            ? buildEmptyStateProps().emptyDescription
            : '暂时无法加载标签总表，已回退为按当前标签名直接拉取分页数据，可稍后刷新重试。'
        }
      />
    </>
  )
}
