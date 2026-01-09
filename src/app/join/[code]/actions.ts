'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function joinLeague(formData: FormData) {
  const supabase = await createClient()

  const leagueId = String(formData.get('leagueId') || '')
  const teamName = String(formData.get('teamName') || '').trim()

  if (!leagueId) throw new Error('Missing league id')
  if (!teamName) throw new Error('Team name is required')

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) throw new Error('Not authenticated')

  const user = userRes.user

  // Attempt to join
  const { error: joinErr } = await supabase.from('league_members').insert({
    league_id: leagueId,
    user_id: user.id,
    team_name: teamName,
  })

  // If already joined (primary key conflict), just redirect to league page
  if (joinErr) {
    const msg = joinErr.message.toLowerCase()
    if (msg.includes('duplicate') || msg.includes('already') || msg.includes('unique')) {
      redirect(`/league/${leagueId}`)
    }
    throw new Error(joinErr.message)
  }

  redirect(`/league/${leagueId}`)
}
