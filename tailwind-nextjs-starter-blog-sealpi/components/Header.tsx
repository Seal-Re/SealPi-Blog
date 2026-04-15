'use client'

import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Logo from '@/data/logo.svg'
import { signIn, useSession } from 'next-auth/react'
import Link from './Link'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'
import SearchButton from './SearchButton'
import UserMenu from '@/components/UserMenu'

const Header = () => {
  const { data: session } = useSession()

  const headerClass = siteMetadata.stickyNav
    ? 'flex items-center w-full justify-between py-5 border-b border-wb-rule-soft sticky top-0 z-50 bg-wb-paper/90 backdrop-blur-md'
    : 'flex items-center w-full bg-wb-paper justify-between py-10 border-b border-wb-rule-soft'

  return (
    <header className={headerClass}>
      <Link href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center justify-between">
          <div className="mr-3">
            <Logo />
          </div>
          {typeof siteMetadata.headerTitle === 'string' ? (
            <div className="font-fraunces text-wb-ink hidden h-6 text-2xl font-medium italic sm:block">
              {siteMetadata.headerTitle}
            </div>
          ) : (
            siteMetadata.headerTitle
          )}
        </div>
      </Link>
      <div className="flex items-center space-x-4 leading-5 sm:-mr-6 sm:space-x-6">
        <div className="no-scrollbar hidden max-w-40 items-center gap-x-4 overflow-x-auto sm:flex md:max-w-72 lg:max-w-96">
          {headerNavLinks
            .filter((link) => link.href !== '/')
            .map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="text-wb-ink hover:text-wb-accent m-1 font-medium transition-colors duration-200"
              >
                {link.title}
              </Link>
            ))}
        </div>
        <SearchButton />
        <ThemeSwitch />
        {session?.user?.githubUserId ? (
          <UserMenu />
        ) : (
          <button
            type="button"
            className="border-wb-rule text-wb-meta hover:border-wb-ink hover:text-wb-ink hidden rounded-full border px-3 py-1 text-xs font-semibold transition sm:block"
            onClick={() => signIn('github', { callbackUrl: '/' })}
          >
            登录
          </button>
        )}
        <MobileNav />
      </div>
    </header>
  )
}

export default Header
