import { buildApiUrl } from '@/lib/api-config'

export const revalidate = 300

export async function GET() {
  try {
    const response = await fetch(buildApiUrl('/api/v1/tags'), {
      next: { revalidate: 300 },
    })
    if (!response.ok) {
      return Response.json([])
    }
    const data = await response.json()
    return Response.json(data)
  } catch {
    return Response.json([])
  }
}
