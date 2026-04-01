'use client'

import Link from '@/components/Link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

type AdminTopbarProps = {
  userName?: string | null
}

function getCrumb(pathname: string) {
  if (pathname.startsWith('/admin/articles')) return '文章管理'
  if (pathname.startsWith('/admin/editor')) return '创作台'
  return '仪表盘'
}

export default function AdminTopbar({ userName }: AdminTopbarProps) {
  const pathname = usePathname()
  const initial = userName?.trim()?.charAt(0)?.toUpperCase() || 'A'

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/85 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/80">
      <div className="flex h-16 items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Admin /{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {getCrumb(pathname)}
            </span>
          </div>
          <div id="admin-topbar-left-extra" className="flex items-center gap-2" />
        </div>
        <div className="flex items-center gap-3">
          <div id="admin-topbar-actions" className="flex items-center gap-3">
            {pathname !== '/admin/editor' ? (
              <Link
                href="/admin/editor"
                className="inline-flex items-center rounded-full bg-gray-950 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-black active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
              >
                快速发布
              </Link>
            ) : null}
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-xs font-bold text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
            {initial}
          </span>
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition-all duration-300 hover:border-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500">
              {userName || 'Admin'}
            </summary>
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-950">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                onClick={() => signOut({ callbackUrl: '/login?next=/admin' })}
              >
                退出登录
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
