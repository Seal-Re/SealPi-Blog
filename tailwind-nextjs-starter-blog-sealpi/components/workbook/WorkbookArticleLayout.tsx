import type { ReactNode } from 'react'
import ExcalidrawHero from './ExcalidrawHero'
import WbMeta from './WbMeta'
import WbDivider from './WbDivider'
import BodyMarkdown from './BodyMarkdown'
import WorkbookRevealInit from './WorkbookRevealInit'

type WorkbookArticleLayoutProps = {
  title: string
  date: string
  tags?: string[]
  readMinutes?: number
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  bodyMd?: string
  eyebrow?: string
  children?: ReactNode
}

export default function WorkbookArticleLayout({
  title,
  date,
  tags,
  readMinutes,
  contentJson,
  coverImageUrl,
  coverCaption,
  bodyMd,
  eyebrow = 'Essay',
  children,
}: WorkbookArticleLayoutProps) {
  return (
    <article className="wb-frame wb-page-enter bg-wb-paper text-wb-ink-soft relative mx-auto my-10 max-w-[820px] rounded-2xl px-8 py-12 md:px-16 md:py-14">
      <WorkbookRevealInit />

      <p className="font-inter text-wb-accent mb-5 text-[11px] font-medium tracking-[0.18em] uppercase">
        {eyebrow}
      </p>

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
        className="font-fraunces text-wb-ink mt-12 mb-5 text-[48px] leading-[1.08] font-medium tracking-[-0.02em] italic"
      >
        {title}
      </h1>

      <WbMeta date={date} readMinutes={readMinutes} tags={tags} />
      <WbDivider />

      {bodyMd ? (
        <div data-reveal>
          <BodyMarkdown markdown={bodyMd} />
        </div>
      ) : null}

      {children}
    </article>
  )
}
