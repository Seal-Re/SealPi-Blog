import Main from './Main'
import {
  BLOG_POSTS_PER_PAGE,
  PUBLIC_FETCH_REVALIDATE_SECONDS,
  fetchPublishedArticles,
} from '@/lib/public-blog-api'

export const revalidate = PUBLIC_FETCH_REVALIDATE_SECONDS

export default async function Page() {
  const posts = await fetchPublishedArticles({ pageSize: BLOG_POSTS_PER_PAGE })
  return <Main posts={posts} />
}
