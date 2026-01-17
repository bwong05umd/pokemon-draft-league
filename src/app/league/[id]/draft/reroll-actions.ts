'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function rerollOrder(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const draftId = String(formData.get('draftId') || '')
  if (!leagueId || !draftId) throw new Error('Missing ids')

  const supabase = await createClient()
  const { error } = await supabase.rpc('reroll_draft_order', { p_draft_id: draftId })
  if (error) throw new Error(error.message)

  redirect(`/league/${leagueId}/draft`)
}
