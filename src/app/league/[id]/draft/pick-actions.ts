'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function submitPick(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const draftId = String(formData.get('draftId') || '')

  // NEW (preferred)
  const poolId = String(formData.get('poolId') || '').trim()

  // OLD (fallback)
  const pokemonName = String(formData.get('pokemonName') || '').trim()

  if (!leagueId || !draftId) throw new Error('Missing ids')
  if (!poolId && !pokemonName) throw new Error('Missing pokemon')

  const supabase = await createClient()

  let resolvedPoolId = poolId

  // If poolId isn't provided, resolve via pokemonName
  if (!resolvedPoolId) {
    const { data: poolRow, error: poolErr } = await supabase
      .from('league_pokemon_pool')
      .select('id')
      .eq('league_id', leagueId)
      .eq('form_key', pokemonName)
      .single()

    if (poolErr) throw new Error(`Pokemon not found in pool: ${pokemonName}`)
    resolvedPoolId = poolRow.id
  }

  const { error } = await supabase.rpc('make_pick_pool', {
    p_draft_id: draftId,
    p_pool_id: resolvedPoolId,
  })

  if (error) throw new Error(error.message)

  redirect(`/league/${leagueId}/draft`)
}
