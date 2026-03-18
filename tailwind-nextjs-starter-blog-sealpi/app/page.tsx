import Main from './Main'
import { fetchPublishedArticles } from '@/lib/public-blog-api'

export default async function Page() {
  const posts = await fetchPublishedArticles({ pageSize: 5 })
  return <Main posts={posts} />
}
