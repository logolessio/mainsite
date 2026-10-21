'use client'

import { Check, Loader2, MessageSquareWarning, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { AdminButton } from './ui'

const CHANGES = ['Tell clippers what to make', 'List what is off limits', 'The audio link does not open', 'Add an official sound or a preview', 'The cover picture is blurry or too small', 'The rate is too low to attract clippers', 'Add an example edit']
const REJECT = ['We cannot allow this kind of content', 'You need the rights to this audio', 'It is a copy of another campaign', 'The budget is too small to run', 'We could not confirm who is behind it']

/**
 * The three things that can happen to a request, on the review page: accept it, send it back with what to fix (the request stays open and
 * the artist is told), or turn it down with a reason the artist reads. A short list of reasons fills the box; the words are always editable.
 */
export function ReviewDecision({ id, title, status, level, budget, startNeeded }: { id: string; title: string; status: string; level: 'ready' | 'look' | 'hold'; budget: string; startNeeded: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'changes' | 'reject' | 'note' | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const open = status === 'requested'
  const waiting = status === 'awaiting_payment'

  const send = async (action: 'changes' | 'reject' | 'note') => {
    if (text.trim().length < 3 || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, note: text.trim() }) })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'That did not go through.')
      toast.ok(action === 'changes' ? 'Sent to the artist' : action === 'reject' ? 'Rejected, and the artist was told why' : 'Note added')
      setText('')
      setMode(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'That did not go through.')
    } finally {
      setBusy(false)
    }
  }

  const add = (reason: string) => setText((t) => (t.trim() ? `${t.trim()} ${reason}.` : `${reason}.`))
  const chips = mode === 'reject' ? REJECT : mode === 'changes' ? CHANGES : []

  return (
    <div className="grid gap-4">
      {open && (
        <div className="grid gap-2 sm:grid-cols-2">
          <AdminButton variant="solid" url={`/api/admin/campaigns/${id}`} data={{ action: 'accept' }} className="h-12 justify-center" confirm={`Accept "${title}"?`} summary={[level === 'ready' ? 'Every check passed.' : level === 'look' ? 'Some checks asked for a look. You have read them.' : 'Some checks block this. Accepting anyway is your call.', `The artist is asked to have ${startNeeded} on their balance to start. If it already is, the campaign goes live now.`, `Budget ${budget}.`]}>
            <Check className="size-4" /> Accept
          </AdminButton>
          <button type="button" onClick={() => setMode(mode === 'changes' ? null : 'changes')} className={cn('inline-flex h-12 items-center justify-center gap-2 rounded-pill border px-5 text-sm transition-colors', mode === 'changes' ? 'border-paper bg-paper/10' : 'border-line-strong hover:bg-white/[0.06]')}>
            <MessageSquareWarning className="size-4" /> Ask for changes
          </button>
        </div>
      )}
      {(open || waiting) && (
        <button type="button" onClick={() => setMode(mode === 'reject' ? null : 'reject')} className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-pill border px-5 text-sm text-signal transition-colors', mode === 'reject' ? 'border-signal/60 bg-signal/10' : 'border-signal/30 hover:bg-signal/10')}>
          <X className="size-4" /> {waiting ? 'Cancel this request' : 'Reject'}
        </button>
      )}
      {!open && !waiting && <p className="rounded-panel border border-dashed border-line p-4 text-sm text-mute">This campaign is past review, so there is nothing to decide. You can still leave a note for the team.</p>}

      {mode && (
        <div className="rounded-panel border border-line bg-white/[0.02] p-4">
          <p className="text-sm font-medium">{mode === 'changes' ? 'What should they fix?' : mode === 'reject' ? 'Why is it not accepted?' : 'A note for the team'}</p>
          <p className="mt-0.5 text-xs text-mute">{mode === 'note' ? 'Only the team sees this.' : mode === 'changes' ? 'The artist gets this as a notification and can fix the request. It stays open.' : 'The artist reads exactly this, so be kind and specific.'}</p>
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button key={c} type="button" onClick={() => add(c)} className="rounded-pill border border-line-strong px-3 py-1.5 text-xs text-mute transition-colors hover:border-paper/40 hover:text-paper">
                  {c}
                </button>
              ))}
            </div>
          )}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={600} placeholder="Write it here" className="mt-3 w-full resize-none rounded-tile border border-line-strong bg-ink/70 p-3 text-sm outline-none focus:border-paper/60" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-mute tabular-nums">{text.length}/600</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => (setMode(null), setText(''))} className="h-10 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]">
                Cancel
              </button>
              <button type="button" disabled={busy || text.trim().length < 3} onClick={() => void send(mode)} className={cn('inline-flex h-10 items-center gap-2 rounded-pill px-5 text-sm font-medium disabled:opacity-40', mode === 'reject' ? 'bg-signal text-white' : 'bg-paper text-ink')}>
                {busy && <Loader2 className="size-4 animate-spin" />} {mode === 'changes' ? 'Send to the artist' : mode === 'reject' ? 'Reject it' : 'Add note'}
              </button>
            </div>
          </div>
        </div>
      )}
      {!mode && (
        <button type="button" onClick={() => setMode('note')} className="justify-self-start text-xs text-mute underline underline-offset-4 transition-colors hover:text-paper">
          Leave a note for the team
        </button>
      )}
    </div>
  )
}
