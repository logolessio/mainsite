'use client'

import { Check, Link2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { toast } from '@/lib/toast'

/** Makes (and copies) the read-only report link for a campaign, and stops sharing it again. */
export function ShareReportButton({ id }: { id: string }) {
  const on = useFeature('share-report')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  if (!on) return null
  const call = async (method: 'POST' | 'DELETE') => {
    setBusy(true)
    try {
      const res = await fetch(`/api/campaigns/${id}/report`, { method })
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok) throw new Error(j.error ?? 'That did not work.')
      if (method === 'POST' && j.url) {
        setUrl(j.url)
        await navigator.clipboard.writeText(j.url).catch(() => {})
        toast.ok('Report link copied. Anyone with it can read the results.')
      } else {
        setUrl('')
        toast.ok('Sharing stopped. The link no longer works.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }
  return url ? (
    <span className="inline-flex items-center gap-2 text-sm">
      <Check aria-hidden="true" className="size-4" /> Shared
      <button type="button" disabled={busy} onClick={() => void call('DELETE')} className="text-mute underline underline-offset-4 hover:text-paper">
        Stop sharing
      </button>
    </span>
  ) : (
    <button type="button" disabled={busy} onClick={() => void call('POST')} className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-3.5 text-sm transition-colors hover:bg-white/[0.06] disabled:opacity-50">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />} Share report
    </button>
  )
}
