'use client'

import { CheckCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { cn } from '@/lib/utils'
import { EmptyFeed, NOTE_KINDS, NotificationFeed, useNoteActions, useNotes } from './notifications'

/** The whole feed on its own page, with a filter for each kind of news. */
export function NotificationsPage() {
  const { notes, update } = useNotes()
  const { markAll, clear } = useNoteActions(update)
  const [kind, setKind] = useState<string>('all')
  const [confirm, setConfirm] = useState(false)

  const kinds = useMemo(() => {
    const seen = new Set((notes ?? []).map((n) => n.kind))
    return Object.keys(NOTE_KINDS).filter((k) => seen.has(k))
  }, [notes])
  const shown = notes ? (kind === 'all' ? notes : kind === 'unread' ? notes.filter((n) => !n.read_at) : notes.filter((n) => n.kind === kind)) : null
  const unread = notes?.filter((n) => !n.read_at).length ?? 0
  const chips = [{ id: 'all', label: 'Everything' }, { id: 'unread', label: `Unread${unread ? ` · ${unread}` : ''}` }, ...kinds.map((k) => ({ id: k, label: NOTE_KINDS[k].label }))]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <GlassTabs compact label="Filter notifications" className="mx-0 min-w-0 shrink" tabs={chips} value={kind} onChange={setKind} />
        <span className="flex-1" />
        {unread > 0 && (
          <button type="button" onClick={markAll} className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-4 text-xs text-mute hover:text-paper">
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        )}
        {notes && notes.length > 0 && (
          <button type="button" onClick={() => (confirm ? (clear(), setConfirm(false)) : setConfirm(true))} className={cn('inline-flex h-9 items-center gap-1.5 rounded-pill border px-4 text-xs', confirm ? 'border-signal/50 bg-signal/10 text-signal' : 'border-line-strong text-mute hover:text-paper')}>
            <Trash2 className="size-3.5" /> {confirm ? 'Really clear everything?' : 'Clear all'}
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line bg-[#0d0d10] pb-3">
        {shown === null && <p className="px-6 py-10 text-sm text-mute">Loading…</p>}
        {shown && shown.length === 0 && <EmptyFeed unreadOnly={kind === 'unread'} />}
        {shown && shown.length > 0 && <NotificationFeed notes={shown} setNotes={update} />}
      </div>
    </div>
  )
}
