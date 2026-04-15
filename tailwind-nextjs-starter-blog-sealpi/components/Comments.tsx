'use client'

import { Comments as CommentsComponent } from 'pliny/comments'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import siteMetadata from '@/data/siteMetadata'

export default function Comments({ slug }: { slug: string }) {
  const [loadComments, setLoadComments] = useState(false)
  const { data: session } = useSession()
  const canComment = Boolean(session?.user?.canComment)

  if (!siteMetadata.comments?.provider) {
    return null
  }

  return (
    <>
      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
        {canComment
          ? '你已登录且具备评论权限，可加载下方评论组件参与讨论。'
          : '当前站点评论为只读模式：可浏览讨论，登录后暂不可发表评论（默认 commentPermission=READ_ONLY）。'}
      </div>
      {canComment ? (
        loadComments ? (
          <CommentsComponent commentsConfig={siteMetadata.comments} slug={slug} />
        ) : (
          <button
            type="button"
            onClick={() => setLoadComments(true)}
            className="border-wb-accent text-wb-accent hover:bg-wb-paper dark:hover:bg-wb-paper/10 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200"
          >
            加载评论
          </button>
        )
      ) : (
        <CommentsComponent commentsConfig={siteMetadata.comments} slug={slug} />
      )}
    </>
  )
}
