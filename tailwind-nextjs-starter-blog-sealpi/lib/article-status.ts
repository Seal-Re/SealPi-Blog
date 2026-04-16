export const ARTICLE_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  ARCHIVED: 2,
} as const

export function isDraftStatus(status?: number | null) {
  return status === ARTICLE_STATUS.DRAFT
}

export function isPublishedStatus(status?: number | null) {
  return status === ARTICLE_STATUS.PUBLISHED
}

export function isArchivedStatus(status?: number | null) {
  return status === ARTICLE_STATUS.ARCHIVED
}
