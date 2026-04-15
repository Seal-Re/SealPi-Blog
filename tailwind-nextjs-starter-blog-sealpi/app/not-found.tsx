import Link from '@/components/Link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-start justify-start md:mt-24 md:flex-row md:items-center md:justify-center md:space-x-6">
      <div className="space-x-2 pt-6 pb-8 md:space-y-5">
        <h1 className="font-fraunces md:border-wb-rule-soft text-wb-ink text-6xl font-medium italic md:border-r-2 md:px-6 md:text-8xl dark:text-gray-100">
          404
        </h1>
      </div>
      <div className="max-w-md">
        <p className="mb-4 text-xl leading-normal font-bold text-gray-900 md:text-2xl dark:text-gray-100">
          找不到这个页面。
        </p>
        <p className="mb-8 text-gray-600 dark:text-gray-300">别担心，可以从首页重新出发。</p>
        <Link
          href="/"
          className="text-wb-accent hover:text-wb-ink inline text-sm font-medium transition-colors duration-200"
        >
          &larr; 返回首页
        </Link>
      </div>
    </div>
  )
}
