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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-full focus:border focus:border-wb-rule focus:bg-wb-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-wb-paper focus:shadow-lg focus:outline-none"
      >
        跳至主要内容
      </a>
      <WorkbookRevealInit />
      <Header />
      <main id="main-content" className="mb-auto">
        {children}
      </main>
      <Footer />
    </SectionContainer>
  )
}
