import { createClient } from '@/lib/supabase/server'
import { startDraft } from './actions'
import { rerollOrderFromLeaguePage } from './reroll-actions'
import { importPool } from './pool-actions'

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

  const { data: draft } = await supabase
    .from('drafts')
    .select('id, current_pick, randomize_order, order_seed')
    .eq('league_id', id)
    .maybeSingle()

  let order:
    | { position: number; user_id: string; team_name: string }[]
    | null = null

  if (draft?.id) {
    const { data } = await supabase
      .from('draft_order')
      .select('position, user_id, team_name')
      .eq('draft_id', draft.id)
      .order('position', { ascending: true })

    order = data ?? null
  }

  const { data: members } = await supabase
    .rpc('get_league_members', { p_league_id: id })

  const { data: pool } = await supabase
    .from('league_pokemon_pool')
    .select('id, name, base_points, base_projection, positions, sprite_url')
    .eq('league_id', id)
    .order('base_projection', { ascending: false })
    .limit(50)

  const isOwner = user?.id === league.owner_id
  const canStart = league.status === 'setup'
  const canReroll = Boolean(isOwner && draft?.id && draft.current_pick === 1)

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">{league.name}</h1>
      <p className="mt-2 text-sm text-gray-600">Status: {league.status}</p>
      {league.locked_team_count && (
        <p className="mt-1 text-sm text-gray-600">
          Locked teams: {league.locked_team_count}
        </p>
      )}

      <a className="mt-4 inline-block underline" href={`/league/${league.id}/draft`}>
        Go to Draft Room
      </a>

      <div className="mt-6 rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Draft Order</h2>

          {canReroll && (
            <form action={rerollOrderFromLeaguePage}>
              <input type="hidden" name="leagueId" value={league.id} />
              <input type="hidden" name="draftId" value={draft!.id} />
              <button className="rounded border px-3 py-1 text-sm">
                Reroll Order
              </button>
            </form>
          )}
        </div>

        {draft?.randomize_order && draft?.order_seed && (
          <p className="mt-1 text-xs text-gray-500">
            Seed: <span className="font-mono">{draft.order_seed}</span>
          </p>
        )}

        {!draft?.id ? (
          <p className="mt-3 text-sm text-gray-600">
            Draft hasn't been created yet. Go to the Draft Room to create it.
          </p>
        ) : !order || order.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">
            Draft order not generated yet.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {order.map((t) => (
              <li
                key={t.user_id}
                className="flex items-center justify-between rounded border p-2"
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 text-right text-sm text-gray-500">
                    {t.position}.
                  </span>
                  <span>{t.team_name}</span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {canReroll && (
          <p className="mt-2 text-xs text-gray-500">
            Owner can reroll until the first pick is made.
          </p>
        )}
      </div>

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

      {isOwner && (
        <div className="mt-6 rounded border p-4">
          <h2 className="font-semibold">Import Pokémon Pool</h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload a CSV or JSON with columns: form_key, base_points, base_projection, positions, sprite_url (optional).
          </p>

          <form action={importPool} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="leagueId" value={league.id} />

            <input
              type="file"
              name="file"
              accept=".csv,.json"
              className="rounded border p-2"
              required
            />

            <button className="rounded bg-black px-4 py-2 text-white">
              Import
            </button>
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
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-black">Owner</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
