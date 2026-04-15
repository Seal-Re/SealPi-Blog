import Link from '@/components/Link'
import Tag from '@/components/Tag'
import { genPageMetadata } from 'app/seo'
import { PUBLIC_FETCH_REVALIDATE_SECONDS, fetchPublishedTags } from '@/lib/public-blog-api'

export const metadata = genPageMetadata({ title: '标签', description: '按标签浏览文章' })
export const revalidate = PUBLIC_FETCH_REVALIDATE_SECONDS

export default async function Page() {
  const tags = await fetchPublishedTags()

  return (
    <>
      <div className="divide-wb-rule-soft flex flex-col items-start justify-start divide-y md:flex-row md:items-center md:justify-center md:space-x-6 md:divide-y-0 dark:divide-gray-700">
        <div className="space-x-2 pt-6 pb-8 md:space-y-5">
          <h1 className="font-fraunces text-wb-ink md:border-wb-rule-soft text-3xl font-medium tracking-tight italic sm:text-4xl md:border-r-2 md:px-6 md:text-6xl dark:text-gray-100">
            标签
          </h1>
        </div>
        <div className="flex max-w-lg flex-wrap">
          {tags.length === 0 && '暂无标签数据。'}
          {tags.map((tag) => {
            return (
              <div key={tag.slug} className="mt-2 mr-5 mb-2">
                <Tag text={tag.name} />
                <Link
                  href={`/tags/${tag.slug}`}
                  className="text-wb-meta -ml-2 text-sm font-semibold uppercase dark:text-gray-300"
                  aria-label={`View posts tagged ${tag.name}`}
                >
                  {` (${tag.count})`}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
