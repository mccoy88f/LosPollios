import { ImageResponse } from 'next/og'

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

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)',
          borderRadius: size === 512 ? '22%' : '18%',
        }}
      >
        <span
          style={{
            fontSize: size * 0.22,
            fontWeight: 800,
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.05em',
          }}
        >
          LP
        </span>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  )
}
