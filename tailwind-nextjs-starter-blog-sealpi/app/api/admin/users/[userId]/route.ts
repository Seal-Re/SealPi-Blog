import { requireAdminBffContext } from '@/app/api/admin/_utils'
import { buildApiUrl } from '@/lib/api-config'

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const ctx = await requireAdminBffContext()
  if (!ctx.token) return ctx.response

  const { userId } = await context.params
  const body = await request.text()

  let backendResponse: Response
  try {
    backendResponse = await fetch(buildApiUrl(`/api/v1/admin/users/${userId}`), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.token}`,
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    })
  } catch (err) {
    const detail = err instanceof Error && err.message ? err.message : '连接后端失败'
    return Response.json(
      { success: false, errCode: '503', errMessage: `BFF 无法连接后端服务：${detail}` },
      { status: 503 }
    )
  }

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
