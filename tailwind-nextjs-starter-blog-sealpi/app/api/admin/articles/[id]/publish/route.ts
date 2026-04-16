import { proxyAdminRequest } from '@/app/api/admin/_utils'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyAdminRequest(`/api/v1/admin/articles/${id}/publish`, 'POST')
}
