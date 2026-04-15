export type ApiResult<T> = {
  success?: boolean
  errCode?: string
  errMessage?: string
  data?: T
}

export type PageResult<T> = {
  data?: T[]
  totalCount?: number
  pageIndex?: number
  pageSize?: number
  totalPage?: number
  success?: boolean
  errCode?: string
  errMessage?: string
}

export type ArticleTag = {
  tagId: number
  name: string
  count?: number
}

export type AdminUser = {
  userId: number
  githubId: number
  githubLogin: string
  nickname?: string
  email?: string
  avatarUrl?: string
  bio?: string
  websiteUrl?: string
  githubProfileUrl?: string
  commentPermission?: string
  banned?: boolean
  createdAt?: string
  lastLoginAt?: string
}

export type AdminArticle = {
  articleId: string
  title: string
  url: string
  summary?: string
  contentJson?: string
  draftJson?: string
  coverImageUrl?: string
  viewCount?: number
  date?: string
  lastmod?: string
  draft?: number
  count?: number
  tags?: ArticleTag[]
  bodyMd?: string
  draftBodyMd?: string
  coverCaption?: string
}
