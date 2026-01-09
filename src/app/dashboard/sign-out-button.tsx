'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function SignOutButton() {
  const supabase = createClient()
  const router = useRouter()

  return (
    <button
      className="rounded border px-4 py-2"
      onClick={async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
      }}
    >
      Sign out
    </button>
  )
}

