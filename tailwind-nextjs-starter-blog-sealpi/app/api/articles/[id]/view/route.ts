import { NextRequest, NextResponse } from 'next/server'
import { buildApiUrl } from '@/lib/api-config'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  try {
    await fetch(buildApiUrl(`/api/v1/articles/${numId}/view`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    // best-effort — swallow backend errors so view tracking never breaks the page
  }

  return NextResponse.json({ success: true })
}
