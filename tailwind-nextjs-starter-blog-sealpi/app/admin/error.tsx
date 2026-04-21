'use client'

import Link from '@/components/Link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="wb-page-enter flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
      <div className="border-wb-rule-soft bg-wb-canvas w-full max-w-md rounded-[2rem] border p-10 text-center shadow-[0_12px_40px_-12px_rgba(31,26,21,0.14)] dark:border-gray-800 dark:bg-gray-950 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-rose-700 uppercase dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          加载失败
        </span>
        <h1 className="text-wb-ink mt-5 text-2xl font-black tracking-tight dark:text-white">
          页面发生错误
        </h1>
        <p className="text-wb-meta mt-3 text-sm leading-7 dark:text-gray-400">
          {error.message || '服务暂时不可用，请稍后重试。'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            重试
          </button>
          <Link
            href="/admin"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回管理台
          </Link>
        </div>
      </div>
    </div>
  )
}
