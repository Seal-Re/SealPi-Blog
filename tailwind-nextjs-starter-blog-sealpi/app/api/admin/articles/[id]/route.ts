import { proxyAdminRequest } from '@/app/api/admin/_utils'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const formData = await request.formData()
  const search = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : ''
  return proxyAdminRequest(`/api/v1/admin/articles/${id}${search}`, 'PUT', formData)
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyAdminRequest(`/api/v1/admin/articles/${id}`, 'DELETE')
}
