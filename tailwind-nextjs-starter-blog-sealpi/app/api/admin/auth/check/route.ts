import { proxyAdminRequest } from '@/app/api/admin/_utils'

export async function GET() {
  return proxyAdminRequest('/api/v1/admin/auth/check', 'GET')
}
