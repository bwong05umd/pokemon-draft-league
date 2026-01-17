'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createDraft(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const rounds = Number(formData.get('rounds') || 10)

  // checkbox is "on" when checked; null when not
  const randomize = formData.get('randomize') === 'on'

  if (!leagueId) throw new Error('Missing league id')
  if (!Number.isFinite(rounds) || rounds < 1 || rounds > 50) throw new Error('Invalid rounds')

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_draft_for_league', {
    p_league_id: leagueId,
    p_rounds: rounds,
    p_randomize: randomize,
    p_seed: null, // let DB generate one
  })

  if (error) throw new Error(error.message)

  redirect(`/league/${leagueId}/draft`)
}
