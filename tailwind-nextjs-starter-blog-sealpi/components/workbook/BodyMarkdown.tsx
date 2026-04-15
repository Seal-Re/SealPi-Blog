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
    if (node.type === 'containerDirective' && (node as unknown as ContainerDirective).name === 'note') {
      const directive = node as unknown as ContainerDirective
      const data = (directive.data ?? (directive.data = {})) as Record<string, unknown>
      data.hName = 'margin-note'
      data.hProperties = {}
    }
  })
}

type BodyMarkdownProps = {
  markdown: string
}

export default function BodyMarkdown({ markdown }: BodyMarkdownProps) {
  return (
    <div className="wb-body max-w-[64ch] font-fraunces text-[18px] leading-[1.75] text-wb-ink-soft">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkNoteDirective]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          'margin-note': ({ children }) => <MarginNote>{children}</MarginNote>,
        } as never}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
