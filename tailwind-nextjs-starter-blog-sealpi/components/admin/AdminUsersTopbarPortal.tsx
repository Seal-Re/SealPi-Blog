'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

type AdminUsersTopbarPortalProps = {
  q?: string
  banned?: string
}

export default function AdminUsersTopbarPortal({ q, banned }: AdminUsersTopbarPortalProps) {
  const [mounted, setMounted] = useState(false)
  const hasFilter = Boolean(q || banned === 'true' || banned === 'false')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const leftExtraAnchor = document.getElementById('admin-topbar-left-extra')
  const actionsAnchor = document.getElementById('admin-topbar-actions')
  if (!leftExtraAnchor || !actionsAnchor) {
    return null
  }

  return (
    <>
      {createPortal(
        hasFilter ? (
          <a
            href="/admin/users"
            className="border-wb-rule-soft bg-wb-canvas text-wb-meta hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper hidden rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 active:scale-95 lg:inline-flex dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
            title="点击快速清空筛选并刷新列表"
          >
            清空筛选
          </a>
        ) : null,
        leftExtraAnchor
      )}
      {createPortal(
        <form
          action="/admin/users"
          method="get"
          className="hidden flex-wrap items-center gap-2 sm:flex"
        >
          <div className="relative">
            <svg
              className="text-wb-meta/70 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 dark:text-gray-500"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              name="q"
              defaultValue={q || ''}
              placeholder="搜索用户名/邮箱"
              className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta focus:border-wb-accent focus:ring-wb-accent/10 w-40 rounded-full border py-2 pr-3 pl-8 text-xs transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            name="banned"
            defaultValue={banned || 'all'}
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink focus:border-wb-accent focus:ring-wb-accent/10 rounded-full border px-3 py-2 text-xs transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="all">全部用户</option>
            <option value="false">正常</option>
            <option value="true">已封禁</option>
          </select>
          <button
            type="submit"
            className="border-wb-rule bg-wb-canvas text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            筛选
          </button>
        </form>,
        actionsAnchor
      )}
    </>
  )
}
