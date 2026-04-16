'use client'

import Link from '@/components/Link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

type AdminTopbarProps = {
  userName?: string | null
}

const mobileNavItems = [
  { href: '/admin', label: '仪表盘' },
  { href: '/admin/ops', label: '运维' },
  { href: '/admin/editor', label: '新建' },
  { href: '/admin/articles', label: '文章' },
  { href: '/admin/drafts', label: '草稿' },
  { href: '/admin/users', label: '用户' },
]

function getCrumb(pathname: string) {
  if (pathname.startsWith('/admin/articles')) return '文章管理'
  if (pathname.startsWith('/admin/drafts')) return '草稿库'
  if (pathname.startsWith('/admin/editor')) return '创作台'
  if (pathname.startsWith('/admin/ops')) return '运维'
  if (pathname.startsWith('/admin/users')) return '用户列表'
  if (pathname.startsWith('/admin/preview')) return '预览'
  return '仪表盘'
}

export default function AdminTopbar({ userName }: AdminTopbarProps) {
  const pathname = usePathname()
  const initial = userName?.trim()?.charAt(0)?.toUpperCase() || 'A'

  return (
    <header className="border-wb-rule-soft/80 bg-wb-canvas/85 sticky top-0 z-40 border-b backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/80">
      <div className="flex h-16 items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="text-wb-meta text-sm dark:text-gray-400">
            Admin /{' '}
            <span className="text-wb-ink font-semibold dark:text-gray-100">
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
                className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
              >
                快速发布
              </Link>
            ) : null}
          </div>
          <span className="border-wb-rule bg-wb-paper text-wb-ink inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white">
            {initial}
          </span>
          <details className="group relative">
            <summary className="border-wb-rule bg-wb-canvas text-wb-ink hover:border-wb-ink cursor-pointer list-none rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500">
              {userName || 'Admin'}
            </summary>
            <div className="border-wb-rule-soft bg-wb-canvas absolute right-0 mt-2 w-40 rounded-xl border p-2 shadow-lg dark:border-gray-800 dark:bg-gray-950">
              <button
                type="button"
                className="hover:bg-wb-paper w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 dark:hover:bg-gray-900"
                onClick={() => signOut({ callbackUrl: '/login?next=/admin' })}
              >
                退出登录
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* Mobile nav — only visible when sidebar is hidden (< lg) */}
      <nav className="no-scrollbar border-wb-rule-soft flex gap-1 overflow-x-auto border-t px-4 pt-1 pb-1 lg:hidden dark:border-gray-800/50">
        {mobileNavItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-wb-accent/10 text-wb-accent dark:bg-white/10 dark:text-white'
                  : 'text-wb-meta hover:bg-wb-paper/60 hover:text-wb-ink dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-gray-200'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
