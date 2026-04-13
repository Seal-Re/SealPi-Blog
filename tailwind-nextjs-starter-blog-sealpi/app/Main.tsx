import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import { formatDate } from 'pliny/utils/formatDate'
import Image from 'next/image'

const MAX_DISPLAY = 5

export default function Home({ posts }) {
  return (
    <>
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
          最新文章
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          {siteMetadata.description}
        </p>
      </div>

      <ul className="space-y-6">
        {!posts.length && (
          <li className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
            暂无可展示文章。
          </li>
        )}
        {posts.slice(0, MAX_DISPLAY).map((post) => {
          const { slug, date, title, summary, tags, coverImageUrl } = post
          return (
            <li key={slug}>
              <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950">
                {coverImageUrl ? (
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src={coverImageUrl}
                      alt={`${title} cover`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 1280px) 100vw, 60vw"
                    />
                  </div>
                ) : null}
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <time
                      dateTime={date}
                      className="text-sm font-medium text-gray-400 dark:text-gray-500"
                    >
                      {formatDate(date, siteMetadata.locale)}
                    </time>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    )}
                  </div>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    <Link href={`/blog/${slug}`}>{title}</Link>
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    {summary}
                  </p>
                  <div className="mt-4">
                    <Link
                      href={`/blog/${slug}`}
                      className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                      aria-label={`Read more: "${title}"`}
                    >
                      阅读全文 &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>

      {posts.length > MAX_DISPLAY && (
        <div className="mt-6 flex justify-end text-base leading-6 font-medium">
          <Link
            href="/blog"
            className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
            aria-label="All posts"
          >
            查看全部文章 &rarr;
          </Link>
        </div>
      )}
    </>
  )
}
