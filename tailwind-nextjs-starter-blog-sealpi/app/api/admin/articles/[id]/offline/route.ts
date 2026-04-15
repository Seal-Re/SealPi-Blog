import { proxyAdminRequest } from '@/app/api/admin/_utils'

export async function POST(_request: Request, context: { params: { id: string } }) {
  const { id } = context.params
  return proxyAdminRequest(`/api/v1/admin/articles/${id}/offline`, 'POST')
}
