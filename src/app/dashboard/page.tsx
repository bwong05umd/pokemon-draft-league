import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'
import { redirect } from 'next/navigation'
import { createLeague } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Auth error:', error)
    redirect('/login')
  }

  if (!user) {
    redirect('/login')
  }

  const { data: memberships, error: membershipsErr } = await supabase
    .from('league_members')
    .select('league_id, team_name, leagues(id, name, status)')
    .eq('user_id', user?.id ?? '')

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="mt-4 rounded border p-4">
        <p className="text-sm text-gray-600">Signed in as</p>
        <p className="font-mono">{user.email}</p>
      </div>

      <div className="mt-6 rounded border p-4">
        <h2 className="text-lg font-semibold">Create a league</h2>

        <form action={createLeague} className="mt-3 flex flex-col gap-3">
          <input
            name="name"
            className="rounded border p-2"
            placeholder="League name"
            required
          />
          <input
            name="teamName"
            className="rounded border p-2"
            placeholder="Your team name"
            required
          />
          <button className="rounded bg-black px-4 py-2 text-white">
            Create League
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Your leagues</h2>

        {membershipsErr ? (
          <p className="mt-2 text-sm text-red-600">{membershipsErr.message}</p>
        ) : !memberships || memberships.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No leagues yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {memberships.map((m: any) => (
              <li key={m.league_id} className="rounded border p-3">
                <div className="font-semibold">{m.leagues?.name}</div>
                <div className="text-sm text-gray-600">
                  Status: {m.leagues?.status} • Your team: {m.team_name}
                </div>
                <a className="text-sm underline" href={`/league/${m.league_id}`}>
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  )
}
