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
      <MenuButton className="focus:ring-primary-500 flex rounded-full ring-offset-white focus:ring-2 focus:ring-offset-2 focus:outline-hidden dark:ring-offset-gray-950">
        <span className="sr-only">打开用户菜单</span>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border border-gray-200 object-cover dark:border-gray-700"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-sm font-bold text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
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
        <MenuItems className="ring-opacity-5 absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black focus:outline-hidden dark:bg-gray-900 dark:ring-gray-700">
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {display}
              </p>
              {isAdmin ? (
                <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 rounded-md px-2 py-0.5 text-xs font-medium">
                  Admin
                </span>
              ) : null}
            </div>
            {handle ? (
              <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400">@{handle}</p>
            ) : null}
            {email ? (
              <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-500">{email}</p>
            ) : null}
            {user.profileBio ? (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {user.profileBio}
              </p>
            ) : null}
            {user.profileBlogUrl ? (
              <a
                href={user.profileBlogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 mt-2 block truncate text-xs hover:underline"
              >
                {user.profileBlogUrl}
              </a>
            ) : null}
            {user.githubProfileUrl ? (
              <a
                href={user.githubProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 mt-1 block truncate text-xs hover:underline"
              >
                GitHub 主页
              </a>
            ) : null}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          <div className="bg-gray-50 py-1 dark:bg-gray-900/50">
            {isAdmin ? (
              <MenuItem>
                {({ focus }) => (
                  <Link
                    href="/admin"
                    className={`${focus ? 'bg-gray-100 dark:bg-gray-800' : ''} block px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100`}
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
                  className={`${focus ? 'bg-gray-100 dark:bg-gray-800' : ''} block px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100`}
                >
                  账号与登录
                </Link>
              )}
            </MenuItem>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          <div className="bg-gray-50 py-1 dark:bg-gray-900/50">
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
