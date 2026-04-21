import { describe, it, expect } from 'vitest'
import { getPageSequence } from '../pagination-utils'

describe('getPageSequence', () => {
  // -----------------------------------------------------------------------
  // Small totals (≤ 7): no ellipsis, all pages shown
  // -----------------------------------------------------------------------

  it('returns all pages when total is 1', () => {
    expect(getPageSequence(1, 1)).toEqual([1])
  })

  it('returns all pages when total is 5', () => {
    expect(getPageSequence(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('returns all pages when total is exactly 7', () => {
    expect(getPageSequence(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('current page does not change output when total ≤ 7', () => {
    expect(getPageSequence(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(getPageSequence(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  // -----------------------------------------------------------------------
  // Large totals (> 7): ellipsis introduced as needed
  // -----------------------------------------------------------------------

  it('shows leading pages and trailing ellipsis when current is near start', () => {
    // current=1: range=[1..3], rangeEnd=3 < 9, so trailing ellipsis
    const seq = getPageSequence(1, 10)
    expect(seq[0]).toBe(1)
    expect(seq).toContain('ellipsis')
    expect(seq[seq.length - 1]).toBe(10)
    // No leading ellipsis
    expect(seq[1]).not.toBe('ellipsis')
  })

  it('shows trailing pages and leading ellipsis when current is near end', () => {
    const seq = getPageSequence(10, 10)
    expect(seq[0]).toBe(1)
    expect(seq).toContain('ellipsis')
    expect(seq[seq.length - 1]).toBe(10)
    // ellipsis comes after 1
    expect(seq[1]).toBe('ellipsis')
  })

  it('shows two ellipses when current is in the middle of a large range', () => {
    const seq = getPageSequence(5, 10)
    expect(seq[0]).toBe(1)
    expect(seq[seq.length - 1]).toBe(10)
    const ellipsisCount = seq.filter((x) => x === 'ellipsis').length
    expect(ellipsisCount).toBe(2)
  })

  it('always starts with page 1 and ends with last page', () => {
    for (const [current, total] of [
      [1, 20],
      [10, 20],
      [20, 20],
      [3, 100],
    ]) {
      const seq = getPageSequence(current, total)
      expect(seq[0]).toBe(1)
      expect(seq[seq.length - 1]).toBe(total)
    }
  })

  it('never contains duplicate page numbers', () => {
    const cases: [number, number][] = [
      [1, 10],
      [5, 10],
      [10, 10],
      [1, 8],
      [4, 8],
      [8, 8],
    ]
    for (const [current, total] of cases) {
      const seq = getPageSequence(current, total)
      const numbers = seq.filter((x): x is number => x !== 'ellipsis')
      const unique = new Set(numbers)
      expect(unique.size).toBe(numbers.length)
    }
  })

  it('page numbers are always in ascending order', () => {
    const seq = getPageSequence(5, 15)
    const numbers = seq.filter((x): x is number => x !== 'ellipsis')
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1])
    }
  })

  it('includes current page in sequence', () => {
    for (const current of [1, 3, 5, 8, 10]) {
      const seq = getPageSequence(current, 10)
      expect(seq).toContain(current)
    }
  })

  // -----------------------------------------------------------------------
  // Boundary cases around the ellipsis threshold
  // -----------------------------------------------------------------------

  it('total=8 with current=1 — one trailing ellipsis', () => {
    // rangeStart=2, rangeEnd=3, rangeEnd < 7 → trailing ellipsis
    const seq = getPageSequence(1, 8)
    expect(seq[0]).toBe(1)
    expect(seq[seq.length - 1]).toBe(8)
    expect(seq).toContain('ellipsis')
    expect(seq.filter((x) => x === 'ellipsis').length).toBe(1)
  })

  it('total=8 with current=8 — one leading ellipsis', () => {
    const seq = getPageSequence(8, 8)
    expect(seq[0]).toBe(1)
    expect(seq[seq.length - 1]).toBe(8)
    expect(seq).toContain('ellipsis')
    expect(seq.filter((x) => x === 'ellipsis').length).toBe(1)
  })

  it('total=8 current=4 — only trailing ellipsis (leading range abuts page 1)', () => {
    // rangeStart=max(2,2)=2, not >2 → no leading ellipsis
    // rangeEnd=min(7,6)=6, 6 < 7 → trailing ellipsis
    const seq = getPageSequence(4, 8)
    expect(seq).toEqual([1, 2, 3, 4, 5, 6, 'ellipsis', 8])
    expect(seq.filter((x) => x === 'ellipsis').length).toBe(1)
  })

  // -----------------------------------------------------------------------
  // Specific golden values from the JSDoc examples
  // -----------------------------------------------------------------------

  it('example: getPageSequence(5, 10) has two ellipses and contains 3,4,5,6,7', () => {
    const seq = getPageSequence(5, 10)
    expect(seq).toEqual([1, 'ellipsis', 3, 4, 5, 6, 7, 'ellipsis', 10])
  })

  it('example: getPageSequence(9, 10) — one leading ellipsis, tail pages', () => {
    const seq = getPageSequence(9, 10)
    expect(seq).toEqual([1, 'ellipsis', 7, 8, 9, 10])
  })
})
