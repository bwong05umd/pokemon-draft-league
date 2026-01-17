export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createDraft } from './actions'
import { submitPick } from './pick-actions'
import DraftRealtime from './DraftRealtime'
import DraftRoomClient from './DraftRoomClient'

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: leagueId } = await params
  const supabase = await createClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, status, owner_id')
    .eq('id', leagueId)
    .single()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwner = user?.id === league?.owner_id

  // Fetch draft if it exists
  const { data: draft } = await supabase
    .from('drafts')
    .select('id, status, team_count, rounds, current_pick, randomize_order, order_seed')
    .eq('league_id', leagueId)
    .maybeSingle()

  // If no draft yet, show "Create Draft" (owner only, league must be drafting)
  if (!draft) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold">{league?.name} — Draft</h1>
        <p className="mt-2 text-sm text-gray-600">
          League status: {league?.status}
        </p>

        {isOwner && league?.status === 'drafting' ? (
          <div className="mt-6 rounded border p-4">
            <h2 className="font-semibold">Create draft</h2>
            <form action={createDraft} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="leagueId" value={leagueId} />

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="randomize" defaultChecked />
                Randomize draft order
              </label>

              <input
                name="rounds"
                type="number"
                min={1}
                max={50}
                defaultValue={10}
                className="rounded border p-2"
              />

              <button className="rounded bg-black px-4 py-2 text-white">
                Create Draft & Generate Order
              </button>
            </form>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-600">
            Waiting for the owner to create the draft.
          </p>
        )}
      </main>
    )
  }

  // Fetch order + picks
  const { data: order } = await supabase
    .from('draft_order')
    .select('position, user_id, team_name')
    .eq('draft_id', draft.id)
    .order('position', { ascending: true })

  const { data: picks } = await supabase
    .from('draft_picks')
    .select('pick_number, round, position, user_id, pool_id')
    .eq('draft_id', draft.id)
    .order('pick_number', { ascending: true })

  // Fetch pool rows
  const { data: poolRows, error: poolErr } = await supabase
    .from('league_pokemon_pool')
    .select('id, form_key, name, sprite_url, base_points, base_projection, positions')
    .eq('league_id', leagueId)
    .order('base_projection', { ascending: false })

  if (poolErr) throw new Error(poolErr.message)

  const teamByUserId = new Map(order?.map(o => [o.user_id, o.team_name]))

  const { data: currentPickRow } = await supabase
    .from('draft_picks')
    .select('pick_number, user_id')
    .eq('draft_id', draft.id)
    .eq('pick_number', draft.current_pick)
    .single()

  const onTheClockName = currentPickRow
    ? (teamByUserId.get(currentPickRow.user_id) ?? 'Unknown')
    : 'Unknown'

  // Compute drafted pool ids
  const draftedPoolIds = (picks ?? [])
    .map(p => p.pool_id)
    .filter(Boolean) as string[]

  // Compute "my picked pool ids"
  const myPickedPoolIds = (picks ?? [])
    .filter(p => p.user_id === user?.id && p.pool_id)
    .map(p => p.pool_id!) as string[]

  // Map poolRows → UIPokemon
  const pokemonPool = (poolRows ?? []).map(r => ({
    id: r.id,
    form_key: r.form_key,
    displayName: r.name,
    spriteUrl: r.sprite_url,
    basePoints: r.base_points,
    projected: Number(r.base_projection),
    positions: (r.positions ?? []) as any,
  }))

  // Build the board list (playersForBoard)
  const poolById = new Map((poolRows ?? []).map(r => [r.id, r]))

  const picksByUser = new Map<string, string[]>()
  for (const p of picks ?? []) {
    if (!p.user_id) continue
    const arr = picksByUser.get(p.user_id) ?? []
    if (p.pool_id) {
      const name = poolById.get(p.pool_id)?.name ?? p.pool_id
      arr.push(name)
    }
    picksByUser.set(p.user_id, arr)
  }

  const playersForBoard =
    (order ?? []).map(o => ({
      id: o.user_id,
      name: o.team_name,
      picks: picksByUser.get(o.user_id) ?? [],
    }))

  // Compute isMyTurn + my team name
  const isMyTurn = currentPickRow?.user_id === user?.id && draft.status === 'active'
  const myTeamName = user?.id ? (teamByUserId.get(user.id) ?? 'My Team') : 'My Team'

  return (
    <>
      <DraftRealtime draftId={draft.id} />
      <DraftRoomClient
        leagueId={leagueId}
        draftId={draft.id}
        totalPoints={100}
        myTeamName={myTeamName}
        isMyTurn={isMyTurn}
        currentDrafterName={onTheClockName}
        nextDrafterName={(() => {
          const nextPickNumber = draft.current_pick + 1
          const nextRow = (picks ?? []).find(p => p.pick_number === nextPickNumber)
          if (!nextRow?.user_id) return '—'
          return teamByUserId.get(nextRow.user_id) ?? 'Unknown'
        })()}
        currentPickNumber={draft.current_pick}
        teamCount={draft.team_count}
        rounds={draft.rounds}
        draftPicks={(picks ?? []) as any}
        myPickedPoolIds={myPickedPoolIds}
        playersForBoard={playersForBoard}
        pokemonPool={pokemonPool}
        draftedPoolIds={draftedPoolIds}
      />
    </>
  )
}
