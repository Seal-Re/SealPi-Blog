'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

type AdminArticlesTopbarPortalProps = {
  q?: string
  status?: string
  tag?: string
}

export default function AdminArticlesTopbarPortal({
  q,
  status,
  tag,
}: AdminArticlesTopbarPortalProps) {
  const [mounted, setMounted] = useState(false)
  const hasFilter = Boolean(q || (status && status !== 'all') || tag)

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
            href="/admin/articles"
            className="border-wb-rule-soft bg-wb-canvas text-wb-meta hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper hidden rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 lg:inline-flex dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
            title="点击快速清空筛选并刷新列表"
          >
            清空筛选
          </a>
        ) : null,
        leftExtraAnchor
      )}
      {createPortal(
        <form action="/admin/articles" method="get" className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q || ''}
            placeholder="搜索标题/slug"
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta focus:border-wb-ink w-36 rounded-full border px-3 py-2 text-xs transition-all duration-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            name="tag"
            defaultValue={tag || ''}
            placeholder="标签"
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta focus:border-wb-ink w-24 rounded-full border px-3 py-2 text-xs transition-all duration-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <select
            name="status"
            defaultValue={status || 'all'}
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink focus:border-wb-ink rounded-full border px-3 py-2 text-xs transition-all duration-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="all">全部</option>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
            <option value="archived">归档</option>
          </select>
          <button
            type="submit"
            className="border-wb-rule bg-wb-canvas text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            筛选
          </button>
        </form>,
        actionsAnchor
      )}
    </>
  )
}
