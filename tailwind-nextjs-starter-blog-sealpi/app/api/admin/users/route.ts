import { proxyAdminRequest } from '@/app/api/admin/_utils'

export async function GET(request: Request) {
  const search = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : ''
  return proxyAdminRequest(`/api/v1/admin/users${search}`, 'GET')
}
