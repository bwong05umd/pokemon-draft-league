import { createClient } from '@/lib/supabase/server'
import { startDraft } from './actions'

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, status, owner_id, invite_code, locked_team_count')
    .eq('id', id)
    .single()

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-600">Error: {error.message}</p>
      </main>
    )
  }

  const { data: members } = await supabase
    .rpc('get_league_members', { p_league_id: id })

  const isOwner = user?.id === league.owner_id
  const canStart = league.status === 'setup'

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">{league.name}</h1>
      <p className="mt-2 text-sm text-gray-600">Status: {league.status}</p>
      {league.locked_team_count && (
        <p className="mt-1 text-sm text-gray-600">
          Locked teams: {league.locked_team_count}
        </p>
      )}

      {isOwner && canStart && (
        <div className="mt-4 rounded border p-4">
          <h2 className="font-semibold">Owner controls</h2>
          <form action={startDraft} className="mt-3">
            <input type="hidden" name="leagueId" value={league.id} />
            <button className="rounded bg-black px-4 py-2 text-white">
              Start Draft
            </button>
            <p className="mt-2 text-sm text-gray-600">
              Requires 8–16 members. This will lock the league size.
            </p>
          </form>
        </div>
      )}

      <div className="mt-4 rounded border p-4">
        <p className="text-sm text-gray-600">Invite link</p>
        <p className="font-mono text-sm">
          {`http://localhost:3000/join/${league.invite_code}`}
        </p>
      </div>

      <div className="mt-6 rounded border p-4">
        <h2 className="font-semibold">Members</h2>

        {!members || members.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No members found.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {members.map((m: any) => (
              <li key={m.user_id} className="flex items-center justify-between rounded border p-2">
                <span>{m.team_name}</span>
                {m.user_id === league.owner_id && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs">Owner</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
