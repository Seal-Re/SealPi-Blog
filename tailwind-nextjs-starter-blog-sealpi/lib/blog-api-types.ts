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
