import Link from '@/components/Link'
import { genPageMetadata } from 'app/seo'
import { PUBLIC_FETCH_REVALIDATE_SECONDS, fetchPublishedTags } from '@/lib/public-blog-api'

export const metadata = genPageMetadata({ title: '标签', description: '按标签浏览文章' })
export const revalidate = PUBLIC_FETCH_REVALIDATE_SECONDS

export default async function Page() {
  const tags = await fetchPublishedTags()

  // Sort by count descending
  const sorted = [...tags].sort((a, b) => b.count - a.count)
  const maxCount = sorted[0]?.count ?? 1

  return (
    <div className="pt-6 pb-16">
      <h1 className="font-fraunces text-wb-ink mb-2 text-3xl font-medium tracking-tight italic sm:text-4xl md:text-6xl">
        标签
      </h1>
      <p className="text-wb-meta mb-10 text-sm">共 {tags.length} 个标签</p>

      {tags.length === 0 ? (
        <p className="text-wb-meta text-sm">暂无标签数据。</p>
      ) : (
        <div className="flex flex-wrap gap-3">
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
                className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent hover:bg-wb-accent/5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold uppercase transition-colors duration-200"
              >
                {tag.name}
                <span className="text-wb-rule text-[0.7em]">{tag.count}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
