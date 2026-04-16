import GithubSlugger from 'github-slugger'

export type TocHeading = {
  level: number
  text: string
  id: string
}

/** Strip basic inline markdown formatting to get plain text, matching rehype-slug behaviour. */
export function plainText(raw: string): string {
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
 * Skips lines inside fenced code blocks (``` or ~~~).
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const slugger = new GithubSlugger()
  const headings: TocHeading[] = []
  let inFence = false

  for (const line of markdown.split('\n')) {
    if (/^(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = line.match(/^(#{2,4}) +(.+?)$/)
    if (!match) continue
    const level = match[1].length
    const text = plainText(match[2])
    const id = slugger.slug(text)
    headings.push({ level, text, id })
  }

  return headings
}
