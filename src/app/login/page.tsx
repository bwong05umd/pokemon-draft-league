'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const nextPath = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setError(error.message)

      router.push(nextPath)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return setError(error.message)

      if (!data.session) {
        return setError('Account created. Please sign in.')
      }

      router.push(nextPath)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold">Login</h1>

      <input
        className="rounded border p-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <input
        className="rounded border p-2"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        disabled={loading || !email || !password}
        onClick={handleSignIn}
      >
        {loading ? 'Loading…' : 'Sign in'}
      </button>

      <button
        className="rounded border px-4 py-2 disabled:opacity-50"
        disabled={loading || !email || !password}
        onClick={handleSignUp}
      >
        Create account
      </button>
    </main>
  )
}
