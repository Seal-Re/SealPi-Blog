'use client'

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock'
import { Fragment, useState, useEffect, useRef } from 'react'
import Link from './Link'
import headerNavLinks from '@/data/headerNavLinks'
import { signIn, signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

const MobileNav = () => {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [navShow, setNavShow] = useState(false)
  const navRef = useRef(null)

  const onToggleNav = () => {
    setNavShow((status) => {
      if (status) {
        enableBodyScroll(navRef.current)
      } else {
        // Prevent scrolling
        disableBodyScroll(navRef.current)
      }
      return !status
    })
  }

  useEffect(() => {
    return clearAllBodyScrollLocks
  })

  return (
    <>
      <button
        aria-label="打开导航菜单"
        onClick={onToggleNav}
        className="focus-visible:ring-wb-accent rounded focus-visible:ring-2 focus-visible:outline-none sm:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="hover:text-wb-accent text-wb-ink h-8 w-8"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <Transition appear show={navShow} as={Fragment} unmount={false}>
        <Dialog as="div" onClose={onToggleNav} unmount={false}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            unmount={false}
          >
            <div className="fixed inset-0 z-60 bg-black/25" />
          </TransitionChild>

          <TransitionChild
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="translate-x-full opacity-0"
            enterTo="translate-x-0 opacity-95"
            leave="transition ease-in duration-200 transform"
            leaveFrom="translate-x-0 opacity-95"
            leaveTo="translate-x-full opacity-0"
            unmount={false}
          >
            <DialogPanel className="bg-wb-canvas/98 fixed top-0 left-0 z-70 h-full w-full duration-300">
              <nav
                ref={navRef}
                className="mt-8 flex h-full basis-0 flex-col items-start overflow-y-auto pt-2 pl-12 text-left"
              >
                {headerNavLinks.map((link) => {
                  const isActive =
                    link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                  return (
                    <Link
                      key={link.title}
                      href={link.href}
                      className={`focus-visible:ring-wb-accent mb-4 py-2 pr-4 text-2xl font-bold tracking-widest outline-0 transition-colors focus-visible:rounded focus-visible:ring-1 focus-visible:outline-none ${isActive ? 'text-wb-accent' : 'text-wb-ink hover:text-wb-accent'}`}
                      onClick={onToggleNav}
                    >
                      {link.title}
                    </Link>
                  )
                })}
                <div className="border-wb-rule-soft mt-8 w-full max-w-xs border-t pt-6">
                  {status === 'loading' ? (
                    <div className="bg-wb-rule-soft h-7 w-20 animate-pulse rounded-full" />
                  ) : session?.user?.githubUserId ? (
                    <div className="space-y-3">
                      <p className="text-wb-ink text-sm font-medium">
                        {session.user.displayName || session.user.name || session.user.githubLogin}
                      </p>
                      {session.user.isAdmin ? (
                        <Link
                          href="/admin"
                          className="hover:text-wb-accent focus-visible:ring-wb-accent text-wb-ink block rounded text-lg font-bold focus-visible:ring-2 focus-visible:outline-none"
                          onClick={onToggleNav}
                        >
                          平台管理
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          onToggleNav()
                          signOut({ callbackUrl: '/' })
                        }}
                        className="rounded text-lg font-bold text-red-600 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:text-red-400"
                      >
                        退出登录
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleNav()
                        signIn('github', { callbackUrl: '/' })
                      }}
                      className="hover:text-wb-accent text-wb-ink focus-visible:ring-wb-accent rounded text-lg font-bold focus-visible:ring-2 focus-visible:outline-none"
                    >
                      登录
                    </button>
                  )}
                </div>
              </nav>

              <button
                className="hover:text-wb-accent text-wb-ink focus-visible:ring-wb-accent fixed top-7 right-4 z-80 h-16 w-16 rounded p-4 focus-visible:ring-2 focus-visible:outline-none"
                aria-label="关闭导航菜单"
                onClick={onToggleNav}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileNav
