import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { adminServerGet } from '@/app/api/admin/_utils'
import type { ArticleStats } from '@/lib/blog-api-types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const stats = await adminServerGet<ArticleStats>('/api/v1/admin/stats')
  return (
    <AdminShell userName={session?.user?.name} draftCount={stats?.draft ?? 0}>
      {children}
    </AdminShell>
  )
}
