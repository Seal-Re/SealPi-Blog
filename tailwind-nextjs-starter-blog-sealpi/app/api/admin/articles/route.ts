import { proxyAdminRequest } from '@/app/api/admin/_utils'

export async function GET(request: Request) {
  const search = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : ''
  return proxyAdminRequest(`/api/v1/admin/articles${search}`, 'GET')
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const search = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : ''
  return proxyAdminRequest(`/api/v1/admin/articles${search}`, 'POST', formData)
}
