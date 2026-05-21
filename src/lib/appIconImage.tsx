/** Icona PWA / favicon: verde brand + urna con spunta (come header). */
export function AppIconImage({ size }: { size: number }) {
  const r = Math.round(size * 0.18)
  const icon = Math.round(size * 0.52)
  const stroke = Math.max(1.5, size * 0.08)
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#063C25',
        borderRadius: r,
      }}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="m9 12 2 2 4-4"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 19H2"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
