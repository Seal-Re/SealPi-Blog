import Link from '@/components/Link'
import { genPageMetadata } from 'app/seo'
import { fetchAllPublishedArticles } from '@/lib/public-blog-api'
import siteMetadata from '@/data/siteMetadata'

export const metadata = genPageMetadata({
  title: '归档',
  description: `${siteMetadata.title} 全部已发布文章按年份归档`,
})
export const revalidate = 300

export default async function ArchivePage() {
  const posts = await fetchAllPublishedArticles()

  // Group articles by year (date is ISO string "YYYY-MM-DDT...")
  const byYear = new Map<number, typeof posts>()
  for (const post of posts) {
    const year = new Date(post.date).getFullYear()
    const existing = byYear.get(year)
    if (existing) {
      existing.push(post)
    } else {
      byYear.set(year, [post])
    }
  }

  // Sort years descending
  const years = Array.from(byYear.keys()).sort((a, b) => b - a)

  return (
    <div className="wb-page-enter pt-8 pb-16 md:pt-12">
      <p className="font-inter text-wb-accent mb-3 text-[11px] font-semibold tracking-[0.26em] uppercase">
        时间 · 记录
      </p>
      <h1 className="font-fraunces text-wb-ink mb-2 text-3xl font-medium tracking-tight italic sm:text-4xl md:text-6xl">
        归档
      </h1>
      <p className="text-wb-meta mb-10 text-sm">
        共 {posts.length} 篇文章 · {years.length} 个年份
      </p>

      {posts.length === 0 ? (
        <p className="text-wb-meta text-sm">暂无已发布文章。</p>
      ) : (
        <div className="space-y-12">
          {years.map((year) => {
            const yearPosts = byYear.get(year)!
            return (
              <section key={year}>
                <div className="mb-5 flex items-center gap-4">
                  <h2 className="font-fraunces text-wb-ink shrink-0 text-2xl font-semibold italic">
                    {year}
                  </h2>
                  <span className="font-inter text-wb-meta shrink-0 text-xs">
                    {yearPosts.length} 篇
                  </span>
                  <div className="border-wb-rule-soft flex-1 border-t" />
                </div>
                <ul className="space-y-1">
                  {yearPosts.map((post) => {
                    const dateObj = new Date(post.date)
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
                    const day = String(dateObj.getDate()).padStart(2, '0')
                    return (
                      <li key={post.slug}>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="group hover:bg-wb-canvas flex items-baseline gap-3 rounded-lg px-2 py-2 transition-colors"
                        >
                          <time
                            dateTime={post.date}
                            className="font-geist-mono text-wb-meta w-10 shrink-0 text-xs tabular-nums"
                          >
                            {month}/{day}
                          </time>
                          <span className="font-fraunces text-wb-ink group-hover:text-wb-accent min-w-0 flex-1 truncate text-base font-medium italic transition-colors">
                            {post.title}
                          </span>
                          {post.tags.length > 0 ? (
                            <span className="font-inter text-wb-meta hidden shrink-0 text-xs sm:block">
                              {post.tags[0]}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
