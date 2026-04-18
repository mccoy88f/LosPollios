'use client'

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/login'
      }}
      className={className ?? 'text-blue-200 hover:text-white text-sm transition-colors'}
    >
      Esci
    </button>
  )
}
