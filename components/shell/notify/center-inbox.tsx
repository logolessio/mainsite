'use client'

import { CheckCheck, Settings2, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { cn } from '@/lib/utils'
import { NOTE_KINDS, useNoteActions, useNotes } from '../notifications'
import { TransitionLink } from '../transition-link'
import { CenterEmpty, CenterFeed, CenterSkeleton } from './center-feed'

/** The Notifications page with the notification centre on: the whole feed, a filter for each kind, and the way to the settings. */
export function CenterInbox() {
  const { notes, update } = useNotes()
  const { markAll, clear } = useNoteActions(update)
  const [kind, setKind] = useState<string>('all')
  const [confirm, setConfirm] = useState(false)

  const kinds = useMemo(() => {
    const seen = new Set((notes ?? []).map((n) => n.kind))
    return Object.keys(NOTE_KINDS).filter((k) => seen.has(k))
  }, [notes])
  const shown = notes ? (kind === 'all' ? notes : notes.filter((n) => n.kind === kind)) : null
  const unread = notes?.filter((n) => !n.read_at).length ?? 0
  const chips = [{ id: 'all', label: 'All' }, ...kinds.map((k) => ({ id: k, label: NOTE_KINDS[k].label }))]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {kinds.length > 1 && <GlassTabs compact label="Filter notifications" className="mx-0 min-w-0 shrink" tabs={chips} value={kind} onChange={setKind} />}
        <span className="flex-1" />
        {unread > 0 && (
          <button type="button" onClick={markAll} aria-label="Mark all as read" title="Mark all as read" className="grid size-9 place-items-center rounded-pill border border-line text-paper/55 transition-colors hover:text-paper">
            <CheckCheck aria-hidden="true" className="size-4" />
          </button>
        )}
        {notes && notes.length > 0 && (
          <button
            type="button"
            onClick={() => (confirm ? (clear(), setConfirm(false)) : setConfirm(true))}
            onBlur={() => setConfirm(false)}
            aria-label={confirm ? 'Press again to clear everything' : 'Clear all'}
            title="Clear all"
            className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-pill border transition-colors', confirm ? 'border-signal/50 bg-signal/10 px-4 text-xs text-signal' : 'w-9 border-line text-paper/55 hover:text-paper')}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {confirm && 'Clear all?'}
          </button>
        )}
        <TransitionLink href="/dashboard/notifications/settings" aria-label="Notification settings" title="Notification settings" className="grid size-9 place-items-center rounded-pill border border-line text-paper/55 transition-colors hover:text-paper">
          <Settings2 aria-hidden="true" className="size-4" />
        </TransitionLink>
      </div>
      <div className="overflow-hidden rounded-[calc(1.75rem*var(--round,1))] border border-line bg-[#0d0d10]">
        {shown === null ? <CenterSkeleton rows={5} /> : shown.length === 0 ? <CenterEmpty tall /> : <CenterFeed notes={shown} setNotes={update} roomy />}
      </div>
    </div>
  )
}
