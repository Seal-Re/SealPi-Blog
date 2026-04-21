'use client'

import Link from '@/components/Link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type AdminTopbarProps = {
  userName?: string | null
}

const mobileNavItems = [
  { href: '/admin', label: '仪表盘' },
  { href: '/admin/editor?mode=new', label: '新建' },
  { href: '/admin/articles', label: '文章' },
  { href: '/admin/drafts', label: '草稿' },
  { href: '/admin/users', label: '用户' },
  { href: '/admin/ops', label: '运维' },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  return (
    <header className="border-wb-rule-soft/80 bg-wb-canvas/85 sticky top-0 z-40 border-b backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/80">
      <div className="flex h-16 items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-wb-meta dark:text-gray-400">Admin</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-wb-rule shrink-0 dark:text-gray-600"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-wb-ink font-semibold dark:text-gray-100">
              {getCrumb(pathname)}
            </span>
          </div>
          <div id="admin-topbar-left-extra" className="flex items-center gap-2" />
        </div>
        <div className="flex items-center gap-3">
          <div id="admin-topbar-actions" className="flex items-center gap-3">
            {pathname !== '/admin/editor' &&
            !pathname.startsWith('/admin/articles') &&
            !pathname.startsWith('/admin/users') &&
            !pathname.startsWith('/admin/preview') ? (
              <Link
                href="/admin/editor?mode=new"
                className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                新建文章
              </Link>
            ) : null}
          </div>
          <span className="border-wb-rule bg-wb-paper text-wb-ink inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white">
            {initial}
          </span>
          <div ref={menuRef} className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              className="border-wb-rule bg-wb-canvas text-wb-ink hover:border-wb-ink focus-visible:ring-wb-accent cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500"
            >
              {userName || 'Admin'}
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="用户菜单"
                className="dropdown-enter border-wb-rule-soft bg-wb-canvas absolute right-0 z-50 mt-2 w-44 rounded-xl border p-2 shadow-lg dark:border-gray-800 dark:bg-gray-950"
              >
                <Link
                  href="/"
                  role="menuitem"
                  className="text-wb-ink hover:bg-wb-paper focus-visible:ring-wb-accent flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-200 dark:hover:bg-gray-900"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg
                    width="12"
                    height="12"
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
                <div className="border-wb-rule-soft my-1 border-t dark:border-gray-800" />
                <button
                  type="button"
                  role="menuitem"
                  className="text-wb-meta hover:bg-wb-paper focus-visible:ring-wb-accent w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-400 dark:hover:bg-gray-900"
                  onClick={() => {
                    setMenuOpen(false)
                    void signOut({ callbackUrl: '/login?next=/admin' })
                  }}
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav — only visible when sidebar is hidden (< lg) */}
      <nav className="no-scrollbar border-wb-rule-soft flex gap-1 overflow-x-auto border-t px-4 pt-1 pb-1 lg:hidden dark:border-gray-800/50">
        {mobileNavItems.map((item) => {
          const itemPath = item.href.split('?')[0]
          const active =
            pathname === itemPath || (itemPath !== '/admin' && pathname.startsWith(itemPath))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`focus-visible:ring-wb-accent rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-95 ${
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
