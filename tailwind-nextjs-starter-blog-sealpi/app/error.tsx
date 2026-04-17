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
    <div className="wb-page-enter flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="border-wb-rule-soft bg-wb-canvas w-full max-w-md rounded-[2rem] border p-10 text-center shadow-[0_12px_40px_-12px_rgba(31,26,21,0.14)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
        <span className="inline-flex rounded-full border border-rose-200/70 bg-rose-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-rose-700 uppercase dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          加载失败
        </span>
        <h1 className="font-fraunces text-wb-ink mt-5 text-2xl font-medium tracking-tight italic">
          页面加载出错
        </h1>
        <p className="text-wb-meta mt-3 text-sm leading-7">
          {error.message || '服务暂时不可用，请稍后重试。'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none"
          >
            重试
          </button>
          <Link
            href="/"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
