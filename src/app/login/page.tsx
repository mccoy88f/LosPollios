'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Vote } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore')
        return
      }

      const user = data.user
      const next = searchParams.get('next')
      if (next && next.startsWith('/') && !next.startsWith('/login')) {
        router.push(next)
        return
      }
      if (user.role === 'admin') router.push('/admin')
      else if (user.role === 'entry' && user.electionId) router.push(`/entry/${user.electionId}`)
      else router.push('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full box-border bg-gray-50 grid place-items-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-sm shrink-0">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-800 mb-3">
            <Vote className="w-8 h-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LosPollios</h1>
          <p className="text-gray-500 text-sm mt-1">Accedi al sistema di spoglio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              placeholder="username"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? 'Accesso...' : 'Accedi'}
          </Button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-8">
          LosPollios · Antonello Migliorelli
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] grid place-items-center bg-gray-50 text-gray-600">
          Caricamento…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
