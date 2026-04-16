'use client'

import { Comments as CommentsComponent } from 'pliny/comments'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import siteMetadata from '@/data/siteMetadata'

export default function Comments({ slug }: { slug: string }) {
  const [loadComments, setLoadComments] = useState(false)
  const { data: session, status } = useSession()
  const canComment = status === 'authenticated' && Boolean(session?.user?.canComment)

  if (!siteMetadata.comments?.provider) {
    return null
  }

  // Avoid flash of incorrect permission banner while session resolves
  if (status === 'loading') {
    return (
      <div className="border-wb-rule-soft bg-wb-paper/80 h-10 animate-pulse rounded-lg border" />
    )
  }

  return (
    <>
      <div className="border-wb-rule-soft bg-wb-paper text-wb-meta mb-4 rounded-lg border px-4 py-3 text-left text-sm">
        {canComment
          ? '你已登录且具备评论权限，可加载下方评论组件参与讨论。'
          : '评论区当前为只读模式，暂不支持发布新评论，可浏览已有讨论。'}
      </div>
      {canComment ? (
        loadComments ? (
          <CommentsComponent commentsConfig={siteMetadata.comments} slug={slug} />
        ) : (
          <button
            type="button"
            onClick={() => setLoadComments(true)}
            className="border-wb-accent text-wb-accent hover:bg-wb-paper focus-visible:ring-wb-accent dark:hover:bg-wb-paper/10 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
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
