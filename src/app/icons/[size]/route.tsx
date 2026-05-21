import { ImageResponse } from 'next/og'
import { AppIconImage } from '@/lib/appIconImage'

const ALLOWED = new Set([192, 512])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: raw } = await params
  const size = parseInt(raw, 10)
  if (!ALLOWED.has(size)) {
    return new Response('Not found', { status: 404 })
  }

  return new ImageResponse(<AppIconImage size={size} />, {
    width: size,
    height: size,
  })
}
