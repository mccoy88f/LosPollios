import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #2563eb, #1e40af)',
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: 'system-ui' }}>L</span>
      </div>
    ),
    { ...size }
  )
}
