import Link from '@/components/Link'

export default function AdminNotFound() {
  return (
    <div className="wb-page-enter flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
      <div className="border-wb-rule-soft bg-wb-canvas w-full max-w-md rounded-[2rem] border p-10 text-center shadow-[0_12px_40px_-12px_rgba(31,26,21,0.14)] dark:border-gray-800 dark:bg-gray-950 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
        <p className="text-wb-accent mb-2 text-6xl font-black dark:text-gray-200">404</p>
        <h1 className="text-wb-ink mt-4 text-2xl font-black tracking-tight dark:text-white">
          找不到该页面
        </h1>
        <p className="text-wb-meta mt-3 text-sm leading-7 dark:text-gray-400">
          该资源不存在或已被删除。
        </p>
        <Link
          href="/admin"
          className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          返回管理台
        </Link>
      </div>
    </div>
  )
}
