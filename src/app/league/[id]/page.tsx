import { createClient } from '@/lib/supabase/server'

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, status, owner_id, invite_code')
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


  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">{league.name}</h1>
      <p className="mt-2 text-sm text-gray-600">Status: {league.status}</p>

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
