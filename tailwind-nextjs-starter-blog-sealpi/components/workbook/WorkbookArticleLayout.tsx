import type { ReactNode } from 'react'
import Link from 'next/link'
import ExcalidrawHero, { hasRenderableElements } from './ExcalidrawHero'
import WbMeta from './WbMeta'
import WbDivider from './WbDivider'
import BodyMarkdown from './BodyMarkdown'
import WorkbookReadingProgress from './WorkbookReadingProgress'
import CopyCodeInit from './CopyCodeInit'
import CopyLinkButton from './CopyLinkButton'
import WbShareButton from './WbShareButton'
import WbToc from './WbToc'
import WbImageLightbox from './WbImageLightbox'
import ViewTracker from './ViewTracker'
import ScrollTopAndComment from '@/components/ScrollTopAndComment'
import Comments from '@/components/Comments'
import siteMetadata from '@/data/siteMetadata'

type AdjacentPost = {
  title: string
  path: string
  date?: string
  coverImageUrl?: string
}

type RelatedPost = {
  title: string
  path: string
  summary: string
  coverImageUrl?: string
  tags: string[]
  date?: string
}

type WorkbookArticleLayoutProps = {
  title: string
  dateIso: string
  lastmodIso?: string
  tags?: string[]
  readMinutes?: number
  viewCount?: number
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  bodyMd?: string
  eyebrow?: string
  eyebrowHref?: string
  articleId?: string | number
  slug?: string
  prevPost?: AdjacentPost | null
  nextPost?: AdjacentPost | null
  relatedPosts?: RelatedPost[]
  children?: ReactNode
}

export default function WorkbookArticleLayout({
  title,
  dateIso,
  lastmodIso,
  tags,
  readMinutes,
  viewCount,
  contentJson,
  coverImageUrl,
  coverCaption,
  bodyMd,
  eyebrow = '随笔',
  eyebrowHref = '/blog',
  articleId,
  slug,
  prevPost,
  nextPost,
  relatedPosts,
  children,
}: WorkbookArticleLayoutProps) {
  const hasRelated = relatedPosts && relatedPosts.length > 0
  const showHero = !!(coverImageUrl || hasRenderableElements(contentJson))

  return (
    <article className="wb-frame wb-page-enter bg-wb-paper text-wb-ink-soft relative mx-auto my-4 max-w-[820px] rounded-2xl px-6 py-10 shadow-[0_12px_48px_-12px_rgba(31,26,21,0.18)] sm:my-10 sm:px-8 sm:py-12 md:px-16 md:py-14 dark:shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55)]">
      <WorkbookReadingProgress />
      <ScrollTopAndComment />
      <CopyCodeInit />
      <WbImageLightbox />
      {articleId != null ? <ViewTracker articleId={articleId} /> : null}

      <Link
        href={eyebrowHref}
        className="font-inter text-wb-accent hover:text-wb-ink focus-visible:ring-wb-accent mb-5 inline-flex items-center gap-1.5 rounded text-[11px] font-medium tracking-[0.18em] uppercase transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none"
      >
        <span aria-hidden="true">←</span>
        {eyebrow}
      </Link>

      <ExcalidrawHero
        contentJson={contentJson}
        coverImageUrl={coverImageUrl}
        coverCaption={coverCaption}
        title={title}
      />

      <h1
        data-reveal
        className={`font-fraunces text-wb-ink mb-5 text-[28px] leading-[1.12] font-medium tracking-[-0.02em] italic sm:text-[38px] sm:leading-[1.1] md:text-[48px] md:leading-[1.08] ${showHero ? 'mt-10 sm:mt-12' : 'mt-6 sm:mt-8'}`}
      >
        {title}
      </h1>

      <WbMeta
        dateIso={dateIso}
        lastmodIso={lastmodIso}
        readMinutes={readMinutes}
        viewCount={viewCount}
        tags={tags}
      />
      <WbDivider />

      {bodyMd ? (
        <div data-reveal>
          <WbToc markdown={bodyMd} />
          <BodyMarkdown markdown={bodyMd} />
        </div>
      ) : null}

      {children}

      {/* Author bio */}
      <div data-reveal className="border-wb-rule-soft mt-14 flex items-start gap-4 border-t pt-8">
        <div className="bg-wb-accent/15 text-wb-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold">
          {siteMetadata.author.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-wb-ink font-fraunces font-semibold italic">
              {siteMetadata.author}
            </span>
            <Link
              href="/about"
              className="text-wb-accent hover:text-wb-ink focus-visible:ring-wb-accent font-inter rounded text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              关于我 →
            </Link>
          </div>
          <p className="text-wb-meta mt-1 text-sm leading-relaxed">{siteMetadata.description}</p>
        </div>
      </div>

      {hasRelated ? (
        <div data-reveal className="border-wb-rule-soft mt-10 border-t pt-10">
          <p className="font-inter text-wb-meta mb-6 text-[11px] font-semibold tracking-[0.22em] uppercase">
            相关文章
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts!.map((post) => (
              <Link
                key={post.path}
                href={`/${post.path}`}
                className="border-wb-rule-soft focus-visible:ring-wb-accent group hover:border-wb-rule hover:bg-wb-canvas flex flex-col gap-2 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                {post.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    loading="lazy"
                    className="border-wb-rule-soft h-28 w-full rounded-lg border object-cover"
                  />
                ) : null}
                <span className="text-wb-ink group-hover:text-wb-accent line-clamp-2 text-sm leading-snug font-semibold transition-colors">
                  {post.title}
                </span>
                {post.date ? (
                  <span className="text-wb-meta font-inter text-[11px]">
                    {new Date(post.date).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
                <span className="text-wb-meta line-clamp-2 text-xs leading-relaxed">
                  {post.summary}
                </span>
                {post.tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="border-wb-rule-soft text-wb-meta font-geist-mono rounded border px-1.5 py-0.5 text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {(prevPost || nextPost) && (
        <div
          data-reveal
          className="border-wb-rule-soft mt-12 grid grid-cols-1 gap-4 border-t pt-8 sm:grid-cols-2"
        >
          {prevPost ? (
            <Link
              href={`/${prevPost.path}`}
              className="border-wb-rule-soft focus-visible:ring-wb-accent group hover:border-wb-rule hover:bg-wb-canvas flex flex-col gap-2 overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none sm:items-start"
            >
              {prevPost.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prevPost.coverImageUrl}
                  alt={prevPost.title}
                  loading="lazy"
                  className="border-wb-rule-soft/60 h-24 w-full border-b object-cover"
                />
              ) : null}
              <div className="flex w-full flex-col gap-1.5 px-4 pt-2 pb-3">
                <span className="text-wb-meta font-inter text-[10px] tracking-[0.16em] uppercase">
                  ← 上一篇
                </span>
                <span className="text-wb-ink group-hover:text-wb-accent line-clamp-2 text-sm leading-snug font-medium transition-colors">
                  {prevPost.title}
                </span>
                {prevPost.date ? (
                  <span className="text-wb-meta font-inter text-[11px]">
                    {new Date(prevPost.date).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {nextPost ? (
            <Link
              href={`/${nextPost.path}`}
              className="border-wb-rule-soft focus-visible:ring-wb-accent group hover:border-wb-rule hover:bg-wb-canvas flex flex-col gap-2 overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none sm:items-end"
            >
              {nextPost.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nextPost.coverImageUrl}
                  alt={nextPost.title}
                  loading="lazy"
                  className="border-wb-rule-soft/60 h-24 w-full border-b object-cover"
                />
              ) : null}
              <div className="flex w-full flex-col gap-1.5 px-4 pt-2 pb-3 sm:items-end sm:text-right">
                <span className="text-wb-meta font-inter text-[10px] tracking-[0.16em] uppercase">
                  下一篇 →
                </span>
                <span className="text-wb-ink group-hover:text-wb-accent line-clamp-2 text-sm leading-snug font-medium transition-colors">
                  {nextPost.title}
                </span>
                {nextPost.date ? (
                  <span className="text-wb-meta font-inter text-[11px]">
                    {new Date(nextPost.date).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
              </div>
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
          className="text-wb-meta hover:text-wb-accent focus-visible:ring-wb-accent font-inter inline-flex items-center gap-2 rounded text-sm transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none"
        >
          <span aria-hidden="true">←</span>
          所有文章
        </Link>
        <div className="flex items-center gap-2">
          <WbShareButton title={title} />
          <CopyLinkButton />
        </div>
      </div>
    </article>
  )
}
