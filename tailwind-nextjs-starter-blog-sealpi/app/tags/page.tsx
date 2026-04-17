import Link from '@/components/Link'
import { genPageMetadata } from 'app/seo'
import { fetchPublishedTags } from '@/lib/public-blog-api'
import siteMetadata from '@/data/siteMetadata'

export const metadata = genPageMetadata({ title: '标签', description: '按标签浏览文章' })
export const revalidate = 300

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: siteMetadata.title, item: siteMetadata.siteUrl },
    { '@type': 'ListItem', position: 2, name: '标签', item: `${siteMetadata.siteUrl}/tags` },
  ],
}

export default async function Page() {
  const tags = await fetchPublishedTags()

  // Sort by count descending
  const sorted = [...tags].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')
  )
  const maxCount = sorted[0]?.count ?? 1

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="wb-page-enter pt-8 pb-16 md:pt-12">
        <p className="font-inter text-wb-accent mb-3 text-[11px] font-semibold tracking-[0.26em] uppercase">
          探索 · 分类
        </p>
        <h1 className="font-fraunces text-wb-ink mb-2 text-3xl font-medium tracking-tight italic sm:text-4xl md:text-6xl">
          标签
        </h1>
        <p className="text-wb-meta mb-10 text-sm">共 {tags.length} 个标签</p>

        {tags.length === 0 ? (
          <p className="text-wb-meta text-sm">暂无标签数据。</p>
        ) : (
          <div data-reveal className="flex flex-wrap gap-3">
            {sorted.map((tag) => {
              // Scale font size between 0.8rem and 1.25rem based on relative count
              const ratio = maxCount > 1 ? (tag.count - 1) / (maxCount - 1) : 0
              const fontSize = 0.8 + ratio * 0.45
              return (
                <Link
                  key={tag.slug}
                  href={`/tags/${tag.slug}`}
                  aria-label={`查看标签：${tag.name}`}
                  style={{ fontSize: `${fontSize}rem` }}
                  className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent hover:bg-wb-accent/5 focus-visible:ring-wb-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold uppercase transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none"
                >
                  {tag.name}
                  <span className="text-wb-rule text-[0.7em]">{tag.count}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
