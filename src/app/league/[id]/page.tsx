import { createClient } from '@/lib/supabase/server'

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, status, invite_code')
    .eq('id', id)
    .single()

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-600">Error: {error.message}</p>
      </main>
    )
  }

  const { data: members, error: membersErr } = await supabase
  .from('league_members')
  .select('user_id, team_name')
  .eq('league_id', id)

  if (membersErr) {
    console.log('membersErr', membersErr.message)
  }


  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">{league.name}</h1>
      <p className="mt-2 text-sm text-gray-600">Status: {league.status}</p>

      <div className="mt-4 rounded border p-4">
        <p className="text-sm text-gray-600">Invite link</p>
        <p className="font-mono text-sm">
          {`http://localhost:3000/join/${league.invite_code}`}
        </p>
      </div>

      <div className="mt-6 rounded border p-4">
        <h2 className="font-semibold">Members</h2>
        <ul className="mt-2 list-disc pl-5">
          {members?.map((m) => (
            <li key={m.user_id}>{m.team_name}</li>
          ))}
        </ul>
      </div>
    </main>
  )
}
