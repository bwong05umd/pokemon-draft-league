'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { submitPick } from './pick-actions'

export type RoleFilter = 'ALL' | 'ACE' | 'DMG' | 'TNK' | 'PVT' | 'HZD'

type SlotRole = 'ACE' | 'DMG' | 'TNK' | 'PVT' | 'HZD' | 'FLX' | 'BN'

const BASE_ROLES: SlotRole[] = ['ACE', 'DMG', 'TNK', 'PVT', 'HZD']

// 10 total slots: 5 starters + 1 flex + 4 bench
const LINEUP_ROLES: SlotRole[] = ['ACE', 'DMG', 'TNK', 'PVT', 'HZD', 'FLX', 'BN', 'BN', 'BN', 'BN']

const ROLE_META: Record<SlotRole, { label: string; pill: string; chip: string }> = {
  ACE: { label: 'ACE', pill: 'bg-purple-600', chip: 'bg-purple-600' },
  DMG: { label: 'DMG', pill: 'bg-red-600', chip: 'bg-red-600' },
  TNK: { label: 'TNK', pill: 'bg-blue-600', chip: 'bg-blue-600' },
  PVT: { label: 'PVT', pill: 'bg-green-600', chip: 'bg-green-600' },
  HZD: { label: 'HZD', pill: 'bg-yellow-600', chip: 'bg-yellow-600' },
  FLX: { label: 'FLX', pill: 'bg-slate-600', chip: 'bg-slate-600' },
  BN: { label: 'BN', pill: 'bg-zinc-700', chip: 'bg-zinc-700' },
}

const FILTER_PILLS: RoleFilter[] = ['ALL', 'ACE', 'DMG', 'TNK', 'PVT', 'HZD']

export type UIPokemon = {
  id: string // <-- poolId (uuid)
  form_key: string // <-- exact name
  displayName: string
  spriteUrl: string | null
  basePoints: number
  projected: number
  positions: Exclude<RoleFilter, 'ALL'>[] // can be 1 or 2 (ACE/DMG/TNK/PVT/HZD)
}

export type PlayerBoard = {
  id: string // user_id
  name: string // team_name
  picks: string[] // poolIds (or display names if you prefer)
}

export type DraftPickCell = {
  pick_number: number
  round: number
  position: number
  user_id: string
  pool_id: string | null
}

export default function DraftRoomClient(props: {
  leagueId: string
  draftId: string
  totalPoints: number
  myTeamName: string
  isMyTurn: boolean

  // header notice
  currentDrafterName: string
  nextDrafterName: string
  currentPickNumber: number

  // draft board grid
  teamCount: number
  rounds: number
  draftPicks: DraftPickCell[]

  myPickedPoolIds: string[]
  playersForBoard: PlayerBoard[]

  pokemonPool: UIPokemon[]
  draftedPoolIds: string[] // all drafted, everyone
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('ALL')
  const [pointValue, setPointValue] = useState('')

  const draftedSet = useMemo(() => new Set(props.draftedPoolIds), [props.draftedPoolIds])

  const pokemonById = useMemo(() => {
    const m = new Map<string, UIPokemon>()
    for (const p of props.pokemonPool) m.set(p.id, p)
    return m
  }, [props.pokemonPool])

  const draftPicksArr: DraftPickCell[] = Array.isArray(props.draftPicks) ? props.draftPicks : []

  const pickByRoundPos = useMemo(() => {
    const m = new Map<string, DraftPickCell>()
    for (const p of draftPicksArr) {
      m.set(`${p.round}:${p.position}`, p)
    }
    return m
  }, [draftPicksArr])

  const picksByUserId = useMemo(() => {
    const m = new Map<string, DraftPickCell[]>()
    for (const p of draftPicksArr) {
      const arr = m.get(p.user_id) ?? []
      arr.push(p)
      m.set(p.user_id, arr)
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => a.pick_number - b.pick_number)
      m.set(k, arr)
    }
    return m
  }, [draftPicksArr])

  const teamNameByUserId = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of props.playersForBoard) m.set(t.id, t.name)
    return m
  }, [props.playersForBoard])

  const usedPoints = useMemo(() => {
    return props.myPickedPoolIds.reduce(
      (sum, id) => sum + (pokemonById.get(id)?.basePoints ?? 0),
      0
    )
  }, [props.myPickedPoolIds, pokemonById])

  const pointsRemaining = props.totalPoints - usedPoints

  // Build the 10-slot lineup:
  //  - Fill ACE/DMG/TNK/PVT/HZD with the first matching pick (in pick order)
  //  - Then put the next unused pick into FLX
  //  - Then fill BN x4 with remaining unused picks
  const lineupSlots = useMemo(() => {
    const pickedMons: UIPokemon[] = props.myPickedPoolIds
      .map((id) => pokemonById.get(id))
      .filter(Boolean) as UIPokemon[]

    const used = new Set<string>()

    // starters
    const starters: Record<'ACE' | 'DMG' | 'TNK' | 'PVT' | 'HZD', UIPokemon | null> = {
      ACE: null,
      DMG: null,
      TNK: null,
      PVT: null,
      HZD: null,
    }

    for (const role of BASE_ROLES) {
      if (role === 'FLX' || role === 'BN') continue
      const found = pickedMons.find((m) => !used.has(m.id) && (m.positions?.includes(role as any) ?? false))
      if (found) {
        starters[role as 'ACE' | 'DMG' | 'TNK' | 'PVT' | 'HZD'] = found
        used.add(found.id)
      }
    }

    // flex
    const flex = pickedMons.find((m) => !used.has(m.id)) ?? null
    if (flex) used.add(flex.id)

    // bench
    const bench: Array<UIPokemon | null> = []
    for (const m of pickedMons) {
      if (used.has(m.id)) continue
      bench.push(m)
      used.add(m.id)
      if (bench.length === 4) break
    }
    while (bench.length < 4) bench.push(null)

    return [
      { role: 'ACE' as const, pokemon: starters.ACE },
      { role: 'DMG' as const, pokemon: starters.DMG },
      { role: 'TNK' as const, pokemon: starters.TNK },
      { role: 'PVT' as const, pokemon: starters.PVT },
      { role: 'HZD' as const, pokemon: starters.HZD },
      { role: 'FLX' as const, pokemon: flex },
      { role: 'BN' as const, pokemon: bench[0] },
      { role: 'BN' as const, pokemon: bench[1] },
      { role: 'BN' as const, pokemon: bench[2] },
      { role: 'BN' as const, pokemon: bench[3] },
    ]
  }, [props.myPickedPoolIds, pokemonById])

  const filteredPool = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const pointsNum = pointValue.trim() === '' ? null : Number(pointValue)

    return props.pokemonPool.filter((p) => {
      if (draftedSet.has(p.id)) return false

      const matchesSearch =
        q === '' ||
        p.displayName.toLowerCase().includes(q) ||
        p.form_key.toLowerCase().includes(q)

      const matchesRole =
        selectedRole === 'ALL' || (p.positions?.includes(selectedRole as any) ?? false)

      const matchesPoints =
        pointsNum == null || Number.isNaN(pointsNum) ? true : p.basePoints === pointsNum

      return matchesSearch && matchesRole && matchesPoints
    })
  }, [props.pokemonPool, draftedSet, searchQuery, selectedRole, pointValue])

  // Simple recommendation: top 5 by projection within the filtered pool
  const recommendedSet = useMemo(() => {
    const top = [...filteredPool]
      .sort((a, b) => (b.projected ?? 0) - (a.projected ?? 0))
      .slice(0, 5)
      .map((p) => p.id)
    return new Set(top)
  }, [filteredPool])

  return (
    <div className="h-screen w-screen bg-[#060b14] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/10 bg-gradient-to-b from-[#0b1a2c] to-[#08101c] px-6 py-5">
        <h1 className="text-center text-3xl font-semibold tracking-tight">Pokémon Fantasy Draft</h1>
        <p className="text-center text-sm text-white/60">Build your ultimate team</p>
        <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-white/70">
          <span>
            <span className="text-white/45">On the clock:</span> <span className="font-semibold text-white">{props.currentDrafterName}</span>
          </span>
          <span>
            <span className="text-white/45">Next up:</span> <span className="font-semibold text-white">{props.nextDrafterName}</span>
          </span>
          <span>
            <span className="text-white/45">Pick:</span> <span className="font-semibold text-white">#{props.currentPickNumber}</span>
          </span>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 grid grid-cols-[360px_1fr] overflow-hidden">
        {/* Left: Your Team */}
        <aside className="border-r border-white/10 bg-[#08101c] p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-3">Your Team</h2>

          {/* Points Remaining */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
            <div className="text-sm text-white/60 text-center">Points Remaining</div>
            <div className={`mt-2 text-center text-5xl font-bold ${pointsRemaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {pointsRemaining}
            </div>
          </div>

          {/* Lineup slots (ACE/DMG/TNK/PVT/HZD/FLX/BNx4) */}
          <div className="space-y-3">
            {lineupSlots.map((slot, idx) => {
              const role = slot.role
              const filled = slot.pokemon
              const meta = ROLE_META[role]

              return (
                <div
                  key={`${role}-${idx}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 flex items-center gap-3"
                >
                  <div
                    className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-bold ${meta.pill}`}
                  >
                    {meta.label}
                  </div>

                  {!filled ? (
                    <div className="text-white/45">Empty Slot</div>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      {filled.spriteUrl ? (
                        <img
                          src={filled.spriteUrl}
                          alt={filled.displayName}
                          className="h-10 w-10"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-white/10" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{filled.displayName}</div>
                        <div className="text-xs text-white/60">
                          {filled.basePoints} pts • {filled.projected} proj
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* Right: Pool Dashboard */}
        <section className="flex flex-col overflow-hidden">
          {/* Search + pills */}
          <div className="border-b border-white/10 bg-[#08101c] px-5 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Pokémon (e.g. Garchomp, Rotom-Wash)"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-white/10"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {FILTER_PILLS.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1 rounded-md border text-sm transition-colors ${
                    selectedRole === role
                      ? role === 'ALL'
                        ? 'bg-white text-black border-white'
                        : 'bg-white/10 text-white border-white/20'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {role}
                </button>
              ))}

              <div className="ml-2 flex items-center gap-2">
                <span className="text-sm text-white/55">Point Value:</span>
                <input
                  value={pointValue}
                  onChange={(e) => setPointValue(e.target.value)}
                  type="number"
                  className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-white/10"
                />
              </div>
            </div>
          </div>

          {/* Pokemon Grid */}
          <div className="flex-1 overflow-y-auto bg-[#060b14]">
            <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPool.map((p) => {
                const drafted = draftedSet.has(p.id)
                const isRecommended = recommendedSet.has(p.id)

                // Role chips (can be multiple)
                const roleChips = (p.positions ?? [])
                  .filter(Boolean)
                  .map((pos) => {
                    const role = pos as SlotRole
                    return {
                      role: pos,
                      cls: ROLE_META[role]?.chip ?? 'bg-white/10',
                    }
                  })

                return (
                  <form key={p.id} action={submitPick}>
                    <input type="hidden" name="leagueId" value={props.leagueId} />
                    <input type="hidden" name="draftId" value={props.draftId} />
                    <input type="hidden" name="poolId" value={p.id} />

                    <button
                      type="submit"
                      disabled={!props.isMyTurn || drafted}
                      className={`relative w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition ${
                        props.isMyTurn && !drafted
                          ? 'hover:bg-white/10'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute left-3 top-3 h-7 w-7 rounded-full bg-yellow-400 text-black flex items-center justify-center text-sm font-bold">
                          ★
                        </div>
                      )}

                      {/* Points badge (top-right) */}
                      <div className="absolute right-3 top-3 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-semibold text-white">
                        {p.basePoints} pts
                      </div>

                      <div className="flex justify-center">
                        {p.spriteUrl ? (
                          <img
                            src={p.spriteUrl}
                            alt={p.displayName}
                            className="h-20 w-20"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded bg-white/10" />
                        )}
                      </div>

                      <div className="mt-3 text-center font-semibold truncate">
                        {p.displayName}
                      </div>

                      <div className="mt-2 flex justify-center flex-wrap gap-1">
                        {roleChips.length > 0 ? (
                          roleChips.map((c) => (
                            <span
                              key={c.role}
                              className={`px-2 py-1 rounded-md text-xs font-semibold ${c.cls}`}
                            >
                              {c.role}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-white/10">—</span>
                        )}
                      </div>

                      <div className="mt-3 text-center text-3xl font-bold">
                        {p.projected}
                      </div>
                      <div className="text-center text-xs text-white/55">Projected Pts</div>

                      {drafted && (
                        <div className="mt-2 text-center text-xs text-red-300">
                          Drafted
                        </div>
                      )}
                    </button>
                  </form>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom: League Draft Board */}
      <footer className="h-[250px] border-t border-white/10 bg-[#08101c] overflow-auto">
        <div className="px-6 py-4">
          <div className="text-lg font-semibold mb-3">League Draft Board</div>

          <div className="min-w-[900px]">
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${props.teamCount}, minmax(240px, 1fr))` }}>
              {props.playersForBoard.slice(0, props.teamCount).map((t, idx) => {
                const picks = picksByUserId.get(t.id) ?? []
                const made = picks.filter((p) => p.pool_id != null).length
                const total = props.rounds

                return (
                  <div key={t.id} className="min-w-[220px]">
                    <div className="mb-2">
                      <div className="text-white font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-white/55">{made} / {total} picks</div>
                    </div>

                    <div className="space-y-2">
                      {picks.filter((p) => p.pool_id != null).map((p) => {
                        const mon = p.pool_id ? pokemonById.get(p.pool_id) : null
                        const label = `${p.round}.${p.position}`

                        return (
                          <div
                            key={p.pick_number}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {mon?.spriteUrl ? (
                                <img src={mon.spriteUrl} alt={mon.displayName} className="h-9 w-9" />
                              ) : (
                                <div className="h-9 w-9 rounded bg-white/10" />
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{mon?.displayName ?? p.pool_id}</div>
                                <div className="text-xs text-white/60">
                                  {mon?.basePoints != null ? `${mon.basePoints} pts` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="text-sm text-white/55 ml-3 flex-shrink-0">{label}</div>
                          </div>
                        )
                      })}

                      {made === 0 && (
                        <div className="text-sm text-white/35">No picks yet</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
