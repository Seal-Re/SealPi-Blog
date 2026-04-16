import { describe, it, expect } from 'vitest'
import { plainText, extractHeadings } from '../toc-utils'

describe('plainText', () => {
  it('returns plain string unchanged', () => {
    expect(plainText('Hello World')).toBe('Hello World')
  })

  it('strips bold (**)', () => {
    expect(plainText('**Bold** text')).toBe('Bold text')
  })

  it('strips italic (*)', () => {
    expect(plainText('*italic* text')).toBe('italic text')
  })

  it('strips bold (__)', () => {
    expect(plainText('__Bold__ text')).toBe('Bold text')
  })

  it('strips italic (_)', () => {
    expect(plainText('_italic_ text')).toBe('italic text')
  })

  it('strips inline code (`)', () => {
    expect(plainText('use `useState` hook')).toBe('use useState hook')
  })

  it('strips markdown links, keeping link text', () => {
    expect(plainText('[link text](https://example.com)')).toBe('link text')
  })

  it('trims surrounding whitespace', () => {
    expect(plainText('  trimmed  ')).toBe('trimmed')
  })

  it('handles mixed formatting', () => {
    expect(plainText('**Bold** and _italic_ with `code`')).toBe('Bold and italic with code')
  })
})

describe('extractHeadings', () => {
  it('returns empty array for empty string', () => {
    expect(extractHeadings('')).toEqual([])
  })

  it('extracts h2 headings (level 2)', () => {
    const md = '## Section One\n\nsome text'
    const result = extractHeadings(md)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ level: 2, text: 'Section One', id: 'section-one' })
  })

  it('extracts h3 headings (level 3)', () => {
    const md = '### Sub Section\n\nsome text'
    const result = extractHeadings(md)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ level: 3, text: 'Sub Section', id: 'sub-section' })
  })

  it('ignores h1 headings', () => {
    const md = '# Title\n## Section'
    const result = extractHeadings(md)
    expect(result).toHaveLength(1)
    expect(result[0].level).toBe(2)
  })

  it('extracts h4 headings (level 4)', () => {
    const md = '#### Deep Sub\n## Keep'
    const result = extractHeadings(md)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ level: 4, text: 'Deep Sub' })
    expect(result[1].level).toBe(2)
  })

  it('ignores h5+ headings', () => {
    const md = '##### Too Deep\n###### Even Deeper\n## Keep'
    const result = extractHeadings(md)
    expect(result).toHaveLength(1)
    expect(result[0].level).toBe(2)
  })

  it('skips headings inside backtick fenced code blocks', () => {
    const md = '## Before\n```\n## Inside fence\n```\n## After'
    const result = extractHeadings(md)
    expect(result).toHaveLength(2)
    expect(result.map((h) => h.text)).toEqual(['Before', 'After'])
  })

  it('skips headings inside tilde fenced code blocks', () => {
    const md = '## Before\n~~~\n## Inside fence\n~~~\n## After'
    const result = extractHeadings(md)
    expect(result).toHaveLength(2)
    expect(result.map((h) => h.text)).toEqual(['Before', 'After'])
  })

  it('deduplicates slug IDs for identical heading text', () => {
    const md = '## Intro\n## Intro\n## Intro'
    const result = extractHeadings(md)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('intro')
    expect(result[1].id).toBe('intro-1')
    expect(result[2].id).toBe('intro-2')
  })

  it('strips inline markdown from heading text', () => {
    const md = '## **Bold** heading with `code`'
    const result = extractHeadings(md)
    expect(result[0].text).toBe('Bold heading with code')
  })

  it('handles mixed h2 and h3 preserving order', () => {
    const md = '## Chapter\n### Section\n## Another Chapter\n### Another Section'
    const result = extractHeadings(md)
    expect(result.map((h) => [h.level, h.text])).toEqual([
      [2, 'Chapter'],
      [3, 'Section'],
      [2, 'Another Chapter'],
      [3, 'Another Section'],
    ])
  })

  it('requires at least one space after hashes', () => {
    const md = '##NoSpace\n## With Space'
    const result = extractHeadings(md)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('With Space')
  })

  it('handles CJK characters in slugs', () => {
    const md = '## 介绍'
    const result = extractHeadings(md)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('介绍')
    // GithubSlugger preserves CJK characters
    expect(result[0].id).toContain('介绍')
  })
})
