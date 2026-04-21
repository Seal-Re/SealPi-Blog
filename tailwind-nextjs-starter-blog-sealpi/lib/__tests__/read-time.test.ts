import { describe, it, expect } from 'vitest'
import { estimateReadMinutes } from '../read-time'

describe('estimateReadMinutes', () => {
  // -----------------------------------------------------------------------
  // Empty / blank input → undefined
  // -----------------------------------------------------------------------

  it('returns undefined for undefined input', () => {
    expect(estimateReadMinutes(undefined)).toBeUndefined()
  })

  it('returns undefined for null input', () => {
    expect(estimateReadMinutes(null)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(estimateReadMinutes('')).toBeUndefined()
  })

  it('returns undefined for whitespace-only string', () => {
    expect(estimateReadMinutes('   \n\t  ')).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Minimum floor: always at least 1 minute
  // -----------------------------------------------------------------------

  it('returns at least 1 for a very short text', () => {
    expect(estimateReadMinutes('hi')).toBeGreaterThanOrEqual(1)
  })

  it('returns at least 1 for a single CJK character', () => {
    expect(estimateReadMinutes('好')).toBeGreaterThanOrEqual(1)
  })

  // -----------------------------------------------------------------------
  // CJK-only content: ~300 chars/min
  // -----------------------------------------------------------------------

  it('estimates ~1 min for 300 CJK characters', () => {
    const cjk = '好'.repeat(300)
    expect(estimateReadMinutes(cjk)).toBe(1)
  })

  it('estimates ~2 min for 600 CJK characters', () => {
    const cjk = '好'.repeat(600)
    expect(estimateReadMinutes(cjk)).toBe(2)
  })

  it('estimates ~5 min for 1500 CJK characters', () => {
    const cjk = '中'.repeat(1500)
    expect(estimateReadMinutes(cjk)).toBe(5)
  })

  // -----------------------------------------------------------------------
  // Latin-only content: ~220 words/min
  // -----------------------------------------------------------------------

  it('estimates ~1 min for 220 Latin words', () => {
    const words = Array.from({ length: 220 }, (_, i) => `word${i}`).join(' ')
    expect(estimateReadMinutes(words)).toBe(1)
  })

  it('estimates ~2 min for 440 Latin words', () => {
    const words = Array.from({ length: 440 }, (_, i) => `word${i}`).join(' ')
    expect(estimateReadMinutes(words)).toBe(2)
  })

  // -----------------------------------------------------------------------
  // Mixed CJK + Latin content
  // -----------------------------------------------------------------------

  it('estimates mixed content by summing both contributions', () => {
    // 300 CJK = 1 min, 220 words = 1 min → expect ~2
    const cjk = '好'.repeat(300)
    const latin = Array.from({ length: 220 }, (_, i) => `word${i}`).join(' ')
    expect(estimateReadMinutes(`${cjk} ${latin}`)).toBe(2)
  })

  it('handles markdown formatting characters as Latin words', () => {
    // Markdown with some CJK and some Latin — result is a number ≥ 1
    const md = '# Hello World\n\n这是一篇测试文章，包含中英文混合内容。\n\nThis is a test article.'
    const result = estimateReadMinutes(md)
    expect(result).toBeDefined()
    expect(result!).toBeGreaterThanOrEqual(1)
  })
})
