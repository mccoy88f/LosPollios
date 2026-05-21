import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Icona “Aggiungi a Home” su iOS / Safari */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #063C25 0%, #084530 50%, #042f1c 100%)',
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 72,
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
    { ...size }
  )
}
