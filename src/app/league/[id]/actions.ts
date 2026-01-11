'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function startDraft(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  if (!leagueId) throw new Error('Missing league id')

  const supabase = await createClient()

  const { error } = await supabase.rpc('start_draft', { p_league_id: leagueId })
  if (error) throw new Error(error.message)

  redirect(`/league/${leagueId}`)
}
