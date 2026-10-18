'use client'

import { Loader2, Megaphone } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Write the message for the announcement bar. It only shows on the live site once "Announcement bar" is pushed. */
export function AnnouncementEditor() {
  const [text, setText] = useState('')
  const [href, setHref] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('/api/admin/announcement', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { announcement?: { text: string; href: string } }) => {
        setText(j.announcement?.text ?? '')
        setHref(j.announcement?.href ?? '')
      })
      .catch(() => {})
  }, [])
  const save = async (clear = false) => {
    setBusy(true)
    setError('')
    setNote('')
    const res = await fetch('/api/admin/announcement', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: clear ? '' : text, href: clear ? '' : href }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res?.ok) return setError(j.error ?? 'Could not save.')
    if (clear) {
      setText('')
      setHref('')
    }
    setNote(clear ? 'Cleared.' : 'Saved. It shows on any site where the Announcement bar feature is on.')
  }
  return (
    <section className="rounded-[calc(2rem*var(--round,1))] border border-line bg-[#0a0a0b] p-6">
      <h3 className="flex items-center gap-2 text-[15px] font-medium"><Megaphone className="size-4" /> Announcement bar message</h3>
      <p className="mt-1 text-sm text-mute">One short line across the top of the public site. Leave it empty for no bar.</p>
      <label className="mt-4 block">
        <span className="font-mono text-xs text-mute">Message ({text.length}/140)</span>
        <input value={text} maxLength={140} onChange={(e) => setText(e.target.value)} placeholder="We are live. Artists, get your first campaign set up today." className="mt-2 h-12 w-full rounded-2xl border border-line-strong bg-ink/70 px-4 text-sm focus:border-paper/60 focus:outline-none" />
      </label>
      <label className="mt-3 block">
        <span className="font-mono text-xs text-mute">Link (optional, a page like /for-brands or an https address)</span>
        <input value={href} maxLength={200} onChange={(e) => setHref(e.target.value)} placeholder="/for-brands" className="mt-2 h-12 w-full rounded-2xl border border-line-strong bg-ink/70 px-4 text-sm focus:border-paper/60 focus:outline-none" />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => save()} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85 disabled:opacity-50">
          {busy && <Loader2 className="size-4 animate-spin" />} Save message
        </button>
        <button type="button" disabled={busy} onClick={() => save(true)} className="h-11 rounded-pill px-4 text-sm text-mute hover:text-paper">Clear</button>
        {note && <span role="status" className="text-sm text-emerald-300">{note}</span>}
        {error && <span role="alert" className="text-sm text-signal">{error}</span>}
      </div>
    </section>
  )
}
