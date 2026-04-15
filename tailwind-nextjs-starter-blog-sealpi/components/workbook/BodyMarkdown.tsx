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
        <a href={`#${id}`} aria-label={`Link to section`} className="wb-heading-anchor">
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
    <div className="wb-body font-fraunces text-wb-ink-soft max-w-[64ch] text-[18px] leading-[1.75]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkNoteDirective]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={
          {
            'margin-note': ({ children }) => <MarginNote>{children}</MarginNote>,
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
          } as never
        }
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
