'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

type AdminArticlesTopbarPortalProps = {
  q?: string
  status?: string
}

export default function AdminArticlesTopbarPortal({ q, status }: AdminArticlesTopbarPortalProps) {
  const [mounted, setMounted] = useState(false)

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
        <a
          href="/admin/articles"
          className="hidden rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition-all duration-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white lg:inline-flex dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          title="点击快速清空筛选并刷新列表"
        >
          清空筛选
        </a>,
        leftExtraAnchor
      )}
      {createPortal(
        <form action="/admin/articles" method="get" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={q || ''}
            placeholder="搜索标题/slug"
            className="w-44 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 transition-all duration-300 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <select
            name="status"
            defaultValue={status || 'all'}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 transition-all duration-300 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="all">全部</option>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
          </select>
          <button
            type="submit"
            className="rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 transition-all duration-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white active:scale-95 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            筛选
          </button>
        </form>,
        actionsAnchor
      )}
    </>
  )
}
