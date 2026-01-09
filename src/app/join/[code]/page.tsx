import { createClient } from '@/lib/supabase/server'
import { joinLeague } from './actions'
import { redirect } from 'next/navigation'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  // Check authentication first
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect(`/login?next=/join/${code}`)
  }

  const { data: league, error } = await supabase
    .rpc('get_league_by_invite', { p_code: code })
    .single()

  if (error || !league) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-bold">Invalid invite link</h1>
        <p className="mt-2 text-sm text-gray-600">This invite code doesn't match any league.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-3xl font-bold">Join: {league.name}</h1>
      <p className="mt-2 text-sm text-gray-600">Status: {league.status}</p>

      <div className="mt-6 rounded border p-4">
        <form action={joinLeague} className="flex flex-col gap-3">
          <input type="hidden" name="leagueId" value={league.id} />

          <input
            name="teamName"
            className="rounded border p-2"
            placeholder="Your team name"
            required
          />

          <button className="rounded bg-black px-4 py-2 text-white">
            Join League
          </button>
        </form>
      </div>
    </main>
  )
}
