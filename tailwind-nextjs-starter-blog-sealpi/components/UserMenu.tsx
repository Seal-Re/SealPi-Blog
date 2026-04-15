'use client'

import { Fragment } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { signOut, useSession } from 'next-auth/react'
import Link from '@/components/Link'

export default function UserMenu() {
  const { data: session } = useSession()
  const user = session?.user
  const isAdmin = Boolean(user?.isAdmin)
  const display = user?.displayName || user?.name || user?.githubLogin || '用户'
  const handle = user?.githubLogin
  const email = user?.email

  if (!user?.githubUserId) {
    return null
  }

  return (
    <Menu as="div" className="relative hidden text-left sm:block">
      <MenuButton className="focus:ring-wb-accent flex rounded-full ring-offset-white focus:ring-2 focus:ring-offset-2 focus:outline-hidden dark:ring-offset-gray-950">
        <span className="sr-only">打开用户菜单</span>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            width={36}
            height={36}
            className="border-wb-rule-soft h-9 w-9 rounded-full border object-cover dark:border-gray-700"
          />
        ) : (
          <span className="border-wb-rule bg-wb-paper text-wb-ink flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
            {display.charAt(0).toUpperCase()}
          </span>
        )}
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="ring-opacity-5 bg-wb-canvas ring-wb-rule absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl shadow-lg ring-1 focus:outline-hidden dark:bg-gray-900 dark:ring-gray-700">
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-wb-ink truncate text-sm font-semibold dark:text-gray-100">
                {display}
              </p>
              {isAdmin ? (
                <span className="bg-wb-paper text-wb-accent rounded-md px-2 py-0.5 text-xs font-medium">
                  Admin
                </span>
              ) : null}
            </div>
            {handle ? (
              <p className="text-wb-meta mt-0.5 truncate text-xs dark:text-gray-400">@{handle}</p>
            ) : null}
            {email ? (
              <p className="text-wb-meta mt-1 truncate text-xs opacity-75 dark:text-gray-500">
                {email}
              </p>
            ) : null}
            {user.profileBio ? (
              <p className="text-wb-meta mt-2 line-clamp-2 text-xs leading-relaxed dark:text-gray-400">
                {user.profileBio}
              </p>
            ) : null}
            {user.profileBlogUrl ? (
              <a
                href={user.profileBlogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-wb-accent mt-2 block truncate text-xs hover:underline"
              >
                {user.profileBlogUrl}
              </a>
            ) : null}
            {user.githubProfileUrl ? (
              <a
                href={user.githubProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-wb-accent mt-1 block truncate text-xs hover:underline"
              >
                GitHub 主页
              </a>
            ) : null}
          </div>

          <div className="border-wb-rule-soft border-t dark:border-gray-800" />

          <div className="bg-wb-paper py-1 dark:bg-gray-900/50">
            {isAdmin ? (
              <MenuItem>
                {({ focus }) => (
                  <Link
                    href="/admin"
                    className={`${focus ? 'bg-wb-canvas dark:bg-gray-800' : ''} text-wb-ink block px-4 py-2.5 text-sm dark:text-gray-100`}
                  >
                    平台管理
                  </Link>
                )}
              </MenuItem>
            ) : null}
            <MenuItem>
              {({ focus }) => (
                <Link
                  href="/login"
                  className={`${focus ? 'bg-wb-paper dark:bg-gray-800' : ''} text-wb-ink block px-4 py-2.5 text-sm dark:text-gray-100`}
                >
                  账号与登录
                </Link>
              )}
            </MenuItem>
          </div>

          <div className="border-wb-rule-soft border-t dark:border-gray-800" />

          <div className="bg-wb-paper py-1 dark:bg-gray-900/50">
            <MenuItem>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`${focus ? 'bg-red-50 dark:bg-red-950/30' : ''} w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400`}
                >
                  退出登录
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  )
}
