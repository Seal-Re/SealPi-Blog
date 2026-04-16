import GithubSlugger from 'github-slugger'

type TocHeading = {
  level: number
  text: string
  id: string
}

/** Strip basic inline markdown formatting to get plain text, matching rehype-slug behaviour. */
function plainText(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim()
}

/**
 * Extract h2 / h3 headings from raw markdown, generating slugged IDs with
 * the same GithubSlugger logic that rehype-slug uses so anchor hrefs match.
 */
function extractHeadings(markdown: string): TocHeading[] {
  const slugger = new GithubSlugger()
  const headings: TocHeading[] = []

  for (const line of markdown.split('\n')) {
    const match = line.match(/^(#{2,3}) +(.+?)$/)
    if (!match) continue
    const level = match[1].length
    const text = plainText(match[2])
    const id = slugger.slug(text)
    headings.push({ level, text, id })
  }

  return headings
}

export default function WbToc({ markdown }: { markdown: string }) {
  const headings = extractHeadings(markdown)
  if (headings.length < 2) return null

  return (
    <nav
      className="border-wb-rule-soft bg-wb-canvas mb-10 rounded-xl border px-5 py-4"
      aria-label="目录"
    >
      <p className="font-inter text-wb-accent mb-3 text-[11px] font-semibold tracking-[0.2em] uppercase">
        目录
      </p>
      <ol className="space-y-1.5">
        {headings.map((h) => (
          <li key={`${h.id}-${h.level}`} style={{ paddingLeft: h.level === 3 ? '1rem' : 0 }}>
            <a
              href={`#${h.id}`}
              className="text-wb-meta hover:text-wb-accent text-sm leading-snug transition-colors duration-150"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
