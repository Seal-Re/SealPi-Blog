'use client'

import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'

type AdminShellProps = {
  children: React.ReactNode
  userName?: string | null
  draftCount?: number
}

export default function AdminShell({ children, userName, draftCount }: AdminShellProps) {
  const pathname = usePathname()
  const isForbidden = pathname === '/admin/forbidden'
  const isEditor = pathname.startsWith('/admin/editor')

  if (isForbidden) {
    return <>{children}</>
  }

  return (
    <div className="bg-wb-paper text-wb-ink min-h-screen dark:bg-gray-900 dark:text-gray-100">
      <div className="flex min-h-screen">
        {!isEditor ? <AdminSidebar draftCount={draftCount} /> : null}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AdminTopbar userName={userName} />
          <main
            className={`min-w-0 flex-1 ${isEditor ? 'max-w-none p-4 sm:p-5' : 'mx-auto w-full max-w-7xl p-5 sm:p-8'}`}
            style={{
              backgroundImage: isEditor
                ? undefined
                : 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(166,88,43,0.04), transparent)',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
