'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ALLOWED = new Set(['ACE', 'PSW', 'SSW', 'STS', 'DMG', 'TNK', 'PVT', 'HZD'])

function parsePositions(raw: string): string[] {
  // Accept formats like: "ACE,DMG" or "ACE | DMG" or "ACE DMG" etc.
  const parts = raw
    .split(/[,|]/g)
    .map((s) => s.trim())
    .filter(Boolean)

  if (parts.length > 2) throw new Error(`positions must have <= 2 values, got ${parts.length}`)
  for (const p of parts) {
    if (!ALLOWED.has(p)) throw new Error(`invalid position: ${p}`)
  }
  return parts
}

// Minimal CSV parser (handles commas, no quotes/escapes). Good enough if your file is clean.
// If your CSV uses quoted fields with commas inside, tell me and we'll switch to a robust parser.
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => (obj[h] = cells[i] ?? ''))
    return obj
  })
}

export async function importPool(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '')
  const file = formData.get('file') as File | null
  if (!leagueId) throw new Error('Missing leagueId')
  if (!file) throw new Error('Missing file')

  const text = await file.text()
  const name = file.name.toLowerCase()

  let rows: any[] = []
  if (name.endsWith('.json')) {
    const parsed = JSON.parse(text)
    rows = Array.isArray(parsed) ? parsed : parsed?.rows ?? []
  } else if (name.endsWith('.csv')) {
    rows = parseCSV(text)
  } else {
    throw new Error('Upload a .csv or .json file')
  }

  if (!rows.length) throw new Error('No rows found in file')

  // Validate + normalize into pool rows
  const poolRows = rows.map((r, idx) => {
    const form_key = String(r.form_key ?? r.name ?? '').trim()
    if (!form_key) throw new Error(`Row ${idx + 1}: missing form_key`)

    const base_points = Number(r.base_points)
    if (!Number.isFinite(base_points)) throw new Error(`Row ${idx + 1}: base_points must be a number`)

    const base_projection = Number(r.base_projection)
    if (!Number.isFinite(base_projection)) throw new Error(`Row ${idx + 1}: base_projection must be a number`)

    const positionsRaw = String(r.positions ?? '').trim()
    if (!positionsRaw) throw new Error(`Row ${idx + 1}: missing positions`)
    const positions = parsePositions(positionsRaw)

    const sprite_url = String(r.sprite_url ?? '').trim() || null

    return {
      league_id: leagueId,
      form_key,
      name: form_key, // per your rule
      base_points: Math.trunc(base_points),
      base_projection,
      positions,
      sprite_url,
    }
  })

  // Owner-only enforcement: only league owner can import
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('owner_id')
    .eq('id', leagueId)
    .single()

  if (leagueErr) throw new Error(leagueErr.message)
  if (league.owner_id !== user.id) throw new Error('Only the league owner can import the pool')

  // Upsert rows: unique constraint is (league_id, form_key)
  const { error } = await supabase
    .from('league_pokemon_pool')
    .upsert(poolRows, { onConflict: 'league_id,form_key' })

  if (error) throw new Error(error.message)

  redirect(`/league/${leagueId}`)
}
