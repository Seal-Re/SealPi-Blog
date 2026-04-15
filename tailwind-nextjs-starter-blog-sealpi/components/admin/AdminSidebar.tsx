'use client'

import Link from '@/components/Link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: '仪表盘' },
  { href: '/admin/ops', label: '运维' },
  { href: '/admin/editor', label: '新建' },
  { href: '/admin/articles', label: '文章管理' },
  { href: '/admin/drafts', label: '草稿箱' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-72 shrink-0 border-r border-gray-800 bg-gray-950 p-6 text-gray-200 lg:flex lg:flex-col">
      <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
        <p className="text-xs tracking-[0.28em] text-gray-400 uppercase">SealPi Admin</p>
        <p className="mt-2 text-lg font-semibold text-white">内容管理中心</p>
      </div>
      <nav className="mt-8 space-y-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:bg-white/6 hover:text-white'
              }`}
            >
              {active ? (
                <span className="bg-wb-accent absolute inset-y-2 left-0 w-1 rounded-full" />
              ) : null}
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
