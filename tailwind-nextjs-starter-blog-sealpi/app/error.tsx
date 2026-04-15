'use client'

import Link from '@/components/Link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-start justify-center space-y-6 py-16">
      <div className="space-y-3">
        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-rose-700 uppercase dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          加载失败
        </span>
        <h1 className="font-fraunces text-wb-ink text-3xl font-medium tracking-tight italic dark:text-gray-100">
          页面加载出错
        </h1>
        <p className="text-wb-meta max-w-xl text-lg leading-7 dark:text-gray-300">
          {error.message || '服务暂时不可用，请稍后重试。'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
        >
          重试
        </button>
        <Link
          href="/"
          className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
