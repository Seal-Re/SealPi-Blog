import { describe, it, expect } from 'vitest'
import {
  ARTICLE_STATUS,
  isArchivedStatus,
  isDraftStatus,
  isPublishedStatus,
} from '../article-status'

describe('ARTICLE_STATUS constants', () => {
  it('DRAFT is 0', () => {
    expect(ARTICLE_STATUS.DRAFT).toBe(0)
  })

  it('PUBLISHED is 1', () => {
    expect(ARTICLE_STATUS.PUBLISHED).toBe(1)
  })

  it('ARCHIVED is 2', () => {
    expect(ARTICLE_STATUS.ARCHIVED).toBe(2)
  })
})

describe('isDraftStatus', () => {
  it('returns true for 0', () => {
    expect(isDraftStatus(0)).toBe(true)
  })

  it('returns false for 1 (published)', () => {
    expect(isDraftStatus(1)).toBe(false)
  })

  it('returns false for 2 (archived)', () => {
    expect(isDraftStatus(2)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isDraftStatus(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isDraftStatus(undefined)).toBe(false)
  })
})

describe('isPublishedStatus', () => {
  it('returns true for 1', () => {
    expect(isPublishedStatus(1)).toBe(true)
  })

  it('returns false for 0 (draft)', () => {
    expect(isPublishedStatus(0)).toBe(false)
  })

  it('returns false for 2 (archived)', () => {
    expect(isPublishedStatus(2)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isPublishedStatus(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isPublishedStatus(undefined)).toBe(false)
  })
})

describe('isArchivedStatus', () => {
  it('returns true for 2', () => {
    expect(isArchivedStatus(2)).toBe(true)
  })

  it('returns false for 0 (draft)', () => {
    expect(isArchivedStatus(0)).toBe(false)
  })

  it('returns false for 1 (published)', () => {
    expect(isArchivedStatus(1)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isArchivedStatus(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isArchivedStatus(undefined)).toBe(false)
  })
})
