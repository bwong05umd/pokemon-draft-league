'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function DraftRealtime({ draftId }: { draftId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const refreshNow = () => router.refresh()

    // ✅ Catch-up whenever user returns to the tab
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshNow()
    }
    const onFocus = () => refreshNow()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    const draftsChannel = supabase
      .channel(`drafts:${draftId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drafts', filter: `id=eq.${draftId}` },
        (payload) => {
          console.log('[realtime] drafts change', payload)
          refreshNow()
        }
      )
      .subscribe((status) => console.log('[realtime] drafts status:', status))

    const picksChannel = supabase
      .channel(`draft_picks:${draftId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draft_picks', filter: `draft_id=eq.${draftId}` },
        (payload) => {
          console.log('[realtime] picks change', payload)
          refreshNow()
        }
      )
      .subscribe((status) => console.log('[realtime] picks status:', status))

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(draftsChannel)
      supabase.removeChannel(picksChannel)
    }
  }, [draftId, router])

  return null
}
