import { auth } from '@/auth'
import { buildApiUrl } from '@/lib/api-config'
import { SignJWT } from 'jose'

/**
 * BFF 前置条件：已登录 + 管理员 + 服务端 JWT 内存在 GitHub token。
 * 不向客户端 session 暴露 accessToken，仅在此用 getToken 读取。
 */
export async function requireAdminBffContext(): Promise<
  { token: string; response: null } | { token: null; response: Response }
> {
  const session = await auth()
  if (!session?.user) {
    return {
      token: null,
      response: Response.json(
        { success: false, errCode: '401', errMessage: '未登录。' },
        { status: 401 }
      ),
    }
  }
  if (!session.user.isAdmin) {
    return {
      token: null,
      response: Response.json(
        { success: false, errCode: '403', errMessage: '无管理员权限。' },
        { status: 403 }
      ),
    }
  }

  const secret = process.env.ADMIN_JWT_SECRET
  const claim = process.env.ADMIN_JWT_GITHUBUSERIDCLAIM || 'githubUserId'
  const githubUserId = session.user.githubUserId
  if (!secret) {
    return {
      token: null,
      response: Response.json(
        {
          success: false,
          errCode: '401',
          errMessage: '缺少 ADMIN_JWT_SECRET，无法签发管理令牌。',
        },
        { status: 401 }
      ),
    }
  }
  if (!githubUserId) {
    return {
      token: null,
      response: Response.json(
        {
          success: false,
          errCode: '401',
          errMessage: '缺少 githubUserId，无法签发管理令牌。',
        },
        { status: 401 }
      ),
    }
  }

  const token = await new SignJWT({ [claim]: githubUserId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(secret))

  return { token, response: null }
}

export async function proxyAdminRequest(
  backendPath: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: BodyInit | null
) {
  const ctx = await requireAdminBffContext()
  if (!ctx.token) {
    return ctx.response
  }
  const { token } = ctx

  const nextHeaders = new Headers()
  nextHeaders.set('Authorization', `Bearer ${token}`)

  const backendResponse = await fetch(buildApiUrl(backendPath), {
    method,
    headers: nextHeaders,
    body,
    cache: 'no-store',
  })

  const contentType = backendResponse.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await backendResponse.json()
    : await backendResponse.text()

  return new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
    status: backendResponse.status,
    headers: {
      'content-type': contentType || 'application/json;charset=UTF-8',
    },
  })
}
