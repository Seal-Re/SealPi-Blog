import { proxyAdminRequest } from '@/app/api/admin/_utils'

export async function POST(request: Request) {
  const formData = await request.formData()
  return proxyAdminRequest('/api/v1/admin/upload', 'POST', formData)
}
