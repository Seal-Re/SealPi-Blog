import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Root } from 'mdast'
import type { ContainerDirective } from 'mdast-util-directive'
import MarginNote from './MarginNote'

/**
 * remark-directive emits containerDirective/leafDirective/textDirective nodes.
 * We transform `:::note` (container) into a custom hast element `<margin-note>` so
 * react-markdown's `components` map can render it as our React component.
 */
const remarkNoteDirective: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node) => {
    if (
      node.type === 'containerDirective' &&
      (node as unknown as ContainerDirective).name === 'note'
    ) {
      const directive = node as unknown as ContainerDirective
      const data = (directive.data ?? (directive.data = {})) as Record<string, unknown>
      data.hName = 'margin-note'
      data.hProperties = {}
    }
  })
}

/** Markdown images: lazy-loaded, responsive, rounded, with optional caption. */
function BodyImage({ src, alt }: ComponentPropsWithoutRef<'img'>) {
  if (!src) return null
  return (
    <span className="my-6 block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt || ''} loading="lazy" decoding="async" className="mx-auto max-w-full" />
      {alt ? (
        <span className="font-inter text-wb-meta mt-2 block text-center text-xs">{alt}</span>
      ) : null}
    </span>
  )
}

/** Markdown tables: horizontally scrollable on narrow screens. */
function BodyTable({ children, ...rest }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="my-6 overflow-x-auto">
      <table {...rest}>{children}</table>
    </div>
  )
}

/** External links open in a new tab; internal links navigate normally. */
function BodyLink({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  const isExternal = href?.startsWith('http') || href?.startsWith('//')
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

/** Heading with hover anchor link. rehype-slug already adds the `id`. */
function HeadingAnchor({
  id,
  children,
  as: Tag,
}: {
  id?: string
  children: React.ReactNode
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}) {
  return (
    <Tag id={id} className="wb-heading group">
      {children}
      {id ? (
        <a href={`#${id}`} aria-label="段落链接" className="wb-heading-anchor">
          #
        </a>
      ) : null}
    </Tag>
  )
}

type BodyMarkdownProps = {
  markdown: string
}

export default function BodyMarkdown({ markdown }: BodyMarkdownProps) {
  return (
    <div className="wb-body font-fraunces text-wb-ink-soft text-[18px] leading-[1.75]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkNoteDirective]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={
          {
            'margin-note': ({ children }) => <MarginNote>{children}</MarginNote>,
            img: ({ src, alt }: ComponentPropsWithoutRef<'img'>) => (
              <BodyImage src={src} alt={alt} />
            ),
            a: ({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) => (
              <BodyLink href={href} {...rest}>
                {children}
              </BodyLink>
            ),
            h1: ({ id, children }: ComponentPropsWithoutRef<'h1'>) => (
              <HeadingAnchor id={id} as="h1">
                {children}
              </HeadingAnchor>
            ),
            h2: ({ id, children }: ComponentPropsWithoutRef<'h2'>) => (
              <HeadingAnchor id={id} as="h2">
                {children}
              </HeadingAnchor>
            ),
            h3: ({ id, children }: ComponentPropsWithoutRef<'h3'>) => (
              <HeadingAnchor id={id} as="h3">
                {children}
              </HeadingAnchor>
            ),
            h4: ({ id, children }: ComponentPropsWithoutRef<'h4'>) => (
              <HeadingAnchor id={id} as="h4">
                {children}
              </HeadingAnchor>
            ),
            h5: ({ id, children }: ComponentPropsWithoutRef<'h5'>) => (
              <HeadingAnchor id={id} as="h5">
                {children}
              </HeadingAnchor>
            ),
            h6: ({ id, children }: ComponentPropsWithoutRef<'h6'>) => (
              <HeadingAnchor id={id} as="h6">
                {children}
              </HeadingAnchor>
            ),
            table: ({ children, ...rest }: ComponentPropsWithoutRef<'table'>) => (
              <BodyTable {...rest}>{children}</BodyTable>
            ),
          } as never
        }
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
