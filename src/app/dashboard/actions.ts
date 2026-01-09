'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createLeague(formData: FormData) {
  const supabase = await createClient()

  const name = String(formData.get('name') || '').trim()
  const teamName = String(formData.get('teamName') || '').trim()

  if (!name) throw new Error('League name is required')
  if (!teamName) throw new Error('Team name is required')

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) throw new Error('Not authenticated')

  const user = userRes.user

  // Create league
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .insert({
      name,
      owner_id: user.id,
      status: 'setup',
      min_teams: 8,
      max_teams: 16,
    })
    .select('id')
    .single()

  if (leagueErr) throw new Error(leagueErr.message)

  // Add creator as member
  const { error: memberErr } = await supabase.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    team_name: teamName,
  })

  if (memberErr) throw new Error(memberErr.message)

  redirect(`/league/${league.id}`)
}
