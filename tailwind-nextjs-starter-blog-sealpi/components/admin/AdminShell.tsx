'use client'

import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'

type AdminShellProps = {
  children: React.ReactNode
  userName?: string | null
}

export default function AdminShell({ children, userName }: AdminShellProps) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login'
  const isForbidden = pathname === '/admin/forbidden'
  const isEditor = pathname.startsWith('/admin/editor')

  if (isLogin || isForbidden) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex min-h-screen">
        {!isEditor ? <AdminSidebar /> : null}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AdminTopbar userName={userName} />
          <main className={`min-w-0 flex-1 p-5 sm:p-8 ${isEditor ? 'max-w-none p-4 sm:p-5' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
