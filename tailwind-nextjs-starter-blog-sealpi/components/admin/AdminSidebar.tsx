'use client'

import Link from '@/components/Link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: '仪表盘',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/admin/editor?mode=new',
    label: '新建文章',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: '/admin/articles',
    label: '文章管理',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/admin/drafts',
    label: '草稿箱',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: '用户列表',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/admin/ops',
    label: '运维',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93l-1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
  },
]

export default function AdminSidebar({ draftCount }: { draftCount?: number }) {
  const pathname = usePathname()

  return (
    <aside className="border-wb-rule-soft bg-wb-canvas hidden w-64 shrink-0 border-r p-5 lg:flex lg:flex-col dark:border-gray-800 dark:bg-gray-950">
      {/* Brand */}
      <div className="border-wb-rule-soft bg-wb-paper/80 mb-6 rounded-xl border px-4 py-3 dark:border-gray-800 dark:bg-gray-900/60">
        <p className="font-geist-mono text-wb-meta text-[10px] tracking-[0.24em] uppercase dark:text-gray-500">
          SealPi Admin
        </p>
        <p className="text-wb-ink mt-1 text-sm font-semibold dark:text-white">内容管理中心</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const itemPath = item.href.split('?')[0]
          const active =
            pathname === itemPath || (itemPath !== '/admin' && pathname.startsWith(itemPath))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gray-400/40 focus-visible:outline-none active:scale-95 dark:focus-visible:ring-white/30 ${
                active
                  ? 'bg-wb-accent/10 text-wb-accent dark:bg-white/8 dark:text-white'
                  : 'text-wb-meta hover:bg-wb-ink/5 hover:text-wb-ink dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200'
              }`}
            >
              {active && (
                <span className="bg-wb-accent absolute top-2 bottom-2 left-0 w-0.5 rounded-full" />
              )}
              <span
                className={`shrink-0 transition-colors duration-200 ${
                  active
                    ? 'text-wb-accent'
                    : 'text-wb-rule group-hover:text-wb-meta dark:text-gray-600 dark:group-hover:text-gray-400'
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/admin/drafts' && draftCount != null && draftCount > 0 ? (
                <span className="bg-wb-accent/15 text-wb-accent ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums dark:bg-white/10 dark:text-gray-300">
                  {draftCount}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-wb-rule-soft mt-4 space-y-0.5 border-t pt-4 dark:border-gray-800">
        <Link
          href="/"
          className="text-wb-meta hover:bg-wb-ink/5 hover:text-wb-ink focus-visible:ring-wb-accent flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          返回前台
        </Link>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: '/login?next=/admin' })}
          className="text-wb-meta focus-visible:ring-wb-accent flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:text-gray-600 dark:hover:bg-white/5 dark:hover:text-rose-400"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          退出登录
        </button>
      </div>
    </aside>
  )
}
