import { getToken } from 'next-auth/jwt'
import { headers } from 'next/headers'

/**
 * 从加密会话 JWT 中读取 GitHub OAuth access token（仅服务端 Route Handler / Server Action 使用）。
 * 不向浏览器 Session JSON 暴露该字段，降低 XSS 场景下的凭据泄露面。
 */
export async function getGithubAccessTokenFromJwt(): Promise<string | undefined> {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return undefined
  }

  const h = await headers()
  const cookie = h.get('cookie') ?? ''
  const token = await getToken({
    req: { headers: { cookie } } as { headers: { cookie: string } },
    secret,
  })

  return (token?.githubAccessToken as string | undefined) ?? undefined
}
