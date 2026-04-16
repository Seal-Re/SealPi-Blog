import type { ReactNode } from 'react'
import Link from 'next/link'
import ExcalidrawHero from './ExcalidrawHero'
import WbMeta from './WbMeta'
import WbDivider from './WbDivider'
import BodyMarkdown from './BodyMarkdown'
import WorkbookRevealInit from './WorkbookRevealInit'
import WorkbookReadingProgress from './WorkbookReadingProgress'
import CopyCodeInit from './CopyCodeInit'
import CopyLinkButton from './CopyLinkButton'
import WbToc from './WbToc'
import WbImageLightbox from './WbImageLightbox'
import ViewTracker from './ViewTracker'
import ScrollTopAndComment from '@/components/ScrollTopAndComment'
import Comments from '@/components/Comments'
import siteMetadata from '@/data/siteMetadata'

type AdjacentPost = {
  title: string
  path: string
}

type RelatedPost = {
  title: string
  path: string
  summary: string
  coverImageUrl?: string
  tags: string[]
}

type WorkbookArticleLayoutProps = {
  title: string
  date: string
  tags?: string[]
  readMinutes?: number
  viewCount?: number
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  bodyMd?: string
  eyebrow?: string
  articleId?: string | number
  slug?: string
  prevPost?: AdjacentPost | null
  nextPost?: AdjacentPost | null
  relatedPosts?: RelatedPost[]
  children?: ReactNode
}

export default function WorkbookArticleLayout({
  title,
  date,
  tags,
  readMinutes,
  viewCount,
  contentJson,
  coverImageUrl,
  coverCaption,
  bodyMd,
  eyebrow = '随笔',
  articleId,
  slug,
  prevPost,
  nextPost,
  relatedPosts,
  children,
}: WorkbookArticleLayoutProps) {
  const hasRelated = relatedPosts && relatedPosts.length > 0

  return (
    <article className="wb-frame wb-page-enter bg-wb-paper text-wb-ink-soft relative mx-auto my-4 max-w-[820px] rounded-2xl px-6 py-10 shadow-[0_12px_48px_-12px_rgba(31,26,21,0.18)] sm:my-10 sm:px-8 sm:py-12 md:px-16 md:py-14 dark:shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]">
      <WorkbookRevealInit />
      <WorkbookReadingProgress />
      <ScrollTopAndComment />
      <CopyCodeInit />
      <WbImageLightbox />
      {articleId != null ? <ViewTracker articleId={articleId} /> : null}

      <Link
        href="/blog"
        className="font-inter text-wb-accent hover:text-wb-ink mb-5 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.18em] uppercase transition-colors duration-200"
      >
        {eyebrow}
      </Link>

      <div data-reveal>
        <ExcalidrawHero
          contentJson={contentJson}
          coverImageUrl={coverImageUrl}
          coverCaption={coverCaption}
          title={title}
        />
      </div>

      <h1
        data-reveal
        className="font-fraunces text-wb-ink mt-10 mb-5 text-[28px] leading-[1.12] font-medium tracking-[-0.02em] italic sm:mt-12 sm:text-[38px] sm:leading-[1.1] md:text-[48px] md:leading-[1.08]"
      >
        {title}
      </h1>

      <WbMeta date={date} readMinutes={readMinutes} viewCount={viewCount} tags={tags} />
      <WbDivider />

      {bodyMd ? (
        <div data-reveal>
          <WbToc markdown={bodyMd} />
          <BodyMarkdown markdown={bodyMd} />
        </div>
      ) : null}

      {children}

      {hasRelated ? (
        <div className="border-wb-rule-soft mt-16 border-t pt-10">
          <p className="font-inter text-wb-meta mb-6 text-[11px] font-semibold tracking-[0.22em] uppercase">
            相关文章
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts!.map((post) => (
              <Link
                key={post.path}
                href={`/${post.path}`}
                className="border-wb-rule-soft hover:border-wb-rule hover:bg-wb-canvas group flex flex-col gap-2 rounded-xl border p-4 transition-colors"
              >
                {post.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="border-wb-rule-soft h-28 w-full rounded-lg border object-cover"
                  />
                ) : null}
                <span className="text-wb-ink group-hover:text-wb-accent line-clamp-2 text-sm leading-snug font-semibold transition-colors">
                  {post.title}
                </span>
                <span className="text-wb-meta line-clamp-2 text-xs leading-relaxed">
                  {post.summary}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {(prevPost || nextPost) && (
        <div className="border-wb-rule-soft mt-12 grid grid-cols-1 gap-4 border-t pt-8 sm:grid-cols-2">
          {prevPost ? (
            <Link
              href={`/${prevPost.path}`}
              className="border-wb-rule-soft hover:border-wb-rule hover:bg-wb-canvas group flex flex-col gap-1.5 rounded-xl border px-4 py-3 transition-colors"
            >
              <span className="text-wb-meta font-inter text-[10px] tracking-[0.16em] uppercase">
                ← 上一篇
              </span>
              <span className="text-wb-ink group-hover:text-wb-accent line-clamp-2 text-sm leading-snug font-medium transition-colors">
                {prevPost.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {nextPost ? (
            <Link
              href={`/${nextPost.path}`}
              className="border-wb-rule-soft hover:border-wb-rule hover:bg-wb-canvas group flex flex-col gap-1.5 rounded-xl border px-4 py-3 text-right transition-colors sm:items-end"
            >
              <span className="text-wb-meta font-inter text-[10px] tracking-[0.16em] uppercase">
                下一篇 →
              </span>
              <span className="text-wb-ink group-hover:text-wb-accent line-clamp-2 text-sm leading-snug font-medium transition-colors">
                {nextPost.title}
              </span>
            </Link>
          ) : null}
        </div>
      )}

      {slug && siteMetadata.comments?.provider ? (
        <div className="border-wb-rule-soft mt-12 border-t pt-10">
          <Comments slug={slug} />
        </div>
      ) : null}

      <div className="border-wb-rule-soft mt-8 flex items-center justify-between border-t pt-8">
        <Link
          href="/blog"
          className="text-wb-meta hover:text-wb-accent font-inter inline-flex items-center gap-2 text-sm transition-colors duration-200"
        >
          <span aria-hidden="true">←</span>
          所有文章
        </Link>
        <CopyLinkButton />
      </div>
    </article>
  )
}
