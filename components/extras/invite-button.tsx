'use client'

import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'

/** A brand asks a creator to take a look at one of its live campaigns. The creator gets a notification with the campaign; nothing is promised on either side. */
export function InviteButton({ handle, name, campaigns }: { handle: string; name: string; campaigns: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState(campaigns[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const send = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/brand/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle, campaignId: pick }) })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Could not send that.')
      setDone(true)
      setOpen(false)
      toast.ok(`${name} has been invited`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send that.')
    } finally {
      setBusy(false)
    }
  }

  if (done) return <span className="text-sm text-mute">Invited</span>
  return open ? (
    <span className="flex basis-full flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`inv-${handle}`}>
        Campaign to invite {name} to
      </label>
      <select id={`inv-${handle}`} value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 min-w-0 flex-1 rounded-pill border border-line-strong bg-ink px-3 text-sm outline-none">
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <button type="button" disabled={busy || !pick} onClick={() => void send()} className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-50">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Send
      </button>
    </span>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]">
      Invite
    </button>
  )
}
