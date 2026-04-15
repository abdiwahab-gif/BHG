import { NextRequest, NextResponse } from 'next/server'

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any))
    const deviceId =
      String(body?.deviceId || '').trim() ||
      String(process.env.ZKTECO_DEVICE_SN || '').trim()

    if (!deviceId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing deviceId. Set ZKTECO_DEVICE_SN in Vercel env or pass { deviceId } in the request body.',
        },
        { status: 400 },
      )
    }

    const backendUrl = getBackendUrl()
    const resp = await fetch(`${backendUrl}/api/zkteco/pull-attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })

    const raw = await resp.text()
    let data: any = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      data = null
    }

    if (!resp.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.message || data?.error || `Backend pull request failed (HTTP ${resp.status})`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to request device upload' },
      { status: 500 },
    )
  }
}
