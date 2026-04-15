import type { ReactNode } from 'react'
import ExcalidrawHero from './ExcalidrawHero'
import WbMeta from './WbMeta'
import WbDivider from './WbDivider'
import BodyMarkdown from './BodyMarkdown'

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
    <article className="relative mx-auto my-10 max-w-[820px] rounded-2xl bg-wb-paper px-8 py-12 text-wb-ink-soft md:px-16 md:py-14">
      <p className="mb-5 font-inter text-[11px] font-medium tracking-[0.18em] text-wb-accent uppercase">
        {eyebrow}
      </p>

      <ExcalidrawHero
        contentJson={contentJson}
        coverImageUrl={coverImageUrl}
        coverCaption={coverCaption}
        title={title}
      />

      <h1 className="mt-12 mb-5 font-fraunces text-[48px] leading-[1.08] font-medium text-wb-ink italic tracking-[-0.02em]">
        {title}
      </h1>

      <WbMeta date={date} readMinutes={readMinutes} tags={tags} />
      <WbDivider />

      {bodyMd ? <BodyMarkdown markdown={bodyMd} /> : null}

      {children}
    </article>
  )
}
