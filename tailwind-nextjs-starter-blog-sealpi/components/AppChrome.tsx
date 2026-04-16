'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import SectionContainer from '@/components/SectionContainer'
import Footer from '@/components/Footer'
import WorkbookRevealInit from '@/components/workbook/WorkbookRevealInit'

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <SectionContainer>
      <WorkbookRevealInit />
      <Header />
      <main className="mb-auto">{children}</main>
      <Footer />
    </SectionContainer>
  )
}
