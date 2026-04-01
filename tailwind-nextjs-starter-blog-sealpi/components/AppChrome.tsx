'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import SectionContainer from '@/components/SectionContainer'
import Footer from '@/components/Footer'

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <SectionContainer>
      <Header />
      <main className="mb-auto">{children}</main>
      <Footer />
    </SectionContainer>
  )
}
