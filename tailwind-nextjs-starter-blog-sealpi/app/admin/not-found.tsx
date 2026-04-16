import Link from '@/components/Link'

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
      <div className="border-wb-rule-soft bg-wb-canvas w-full max-w-md rounded-[2rem] border p-10 text-center dark:border-gray-800 dark:bg-gray-950">
        <p className="text-wb-accent mb-2 text-6xl font-black dark:text-gray-200">404</p>
        <h1 className="text-wb-ink mt-4 text-2xl font-black tracking-tight dark:text-white">
          找不到该页面
        </h1>
        <p className="text-wb-meta mt-3 text-sm leading-7 dark:text-gray-400">
          该资源不存在或已被删除。
        </p>
        <Link
          href="/admin"
          className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
        >
          <span aria-hidden="true">←</span>
          返回管理台
        </Link>
      </div>
    </div>
  )
}
