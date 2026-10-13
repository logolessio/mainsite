'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Textarea } from '@/components/ui/fields'
import { cn } from '@/lib/utils'

type Msg = { by: 'admin' | 'you'; text: string; at: number }
const when = (t: number) => new Date(t * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

/** A conversation: the first message, each reply, and a box to add to it. Used by the sender and, with `admin`, by the team. */
export function InquiryThread({ id, token, subject, first, firstAt, target, initial, status, admin = false, who = 'you' }: { id: string; token?: string; subject: string; first: string; firstAt: number; target?: string; initial: Msg[]; status: string; admin?: boolean; who?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial)
  const [state, setState] = useState(status)
  const [text, setText] = useState('')
  const [close, setClose] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (busy || text.trim().length < 2) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(admin ? `/api/admin/inquiries/${id}` : `/api/inquiries/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(admin ? { action: 'reply', text, close } : { text, t: token }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Could not send that.')
      setMsgs((m) => [...m, { by: admin ? 'admin' : 'you', text: text.trim(), at: Math.floor(Date.now() / 1000) }])
      setState(admin ? (close ? 'closed' : 'open') : 'open')
      setText('')
      setClose(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send that.')
    }
    setBusy(false)
  }

  const setStatus = async (next: 'open' | 'closed') => {
    const res = await fetch(`/api/admin/inquiries/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'status', status: next }) })
    if (res.ok) setState(next)
  }

  const all: (Msg & { mine: boolean })[] = [{ by: 'you', text: first, at: firstAt, mine: !admin }, ...msgs.map((m) => ({ ...m, mine: admin ? m.by === 'admin' : m.by === 'you' }))]

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-3xl leading-tight md:text-4xl">{subject}</p>
        <span className={cn('rounded-full border px-3 py-1 text-xs', state === 'closed' ? 'border-line text-mute' : 'border-paper/50')}>{state === 'closed' ? 'Closed' : state === 'new' ? 'Sent' : 'Open'}</span>
      </div>
      {target && <p className="text-sm text-mute">About: <span className="break-all text-paper/80">{target}</span></p>}
      <ul className="grid gap-3">
        {all.map((m, i) => (
          <li key={i} className={cn('max-w-[min(34rem,92%)] rounded-3xl px-5 py-4', m.mine ? 'ml-auto bg-paper text-ink' : 'border border-line-strong')}>
            <p className={cn('text-xs', m.mine ? 'text-ink/55' : 'text-mute')}>
              {admin ? (m.by === 'admin' ? 'You (team)' : who) : m.by === 'admin' ? 'logoless team' : 'You'} · {when(m.at)}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-[16px] leading-relaxed">{m.text}</p>
          </li>
        ))}
      </ul>
      {state === 'closed' && !admin ? (
        <p className="rounded-2xl border border-line px-5 py-4 text-sm text-mute">This conversation is closed. If you need more, send a new message.</p>
      ) : (
        <div className="grid gap-3">
          <Textarea aria-label="Your reply" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} placeholder={admin ? 'Write your reply' : 'Add to the conversation'} />
          {error && (
            <p role="alert" className="text-sm text-signal">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={send} disabled={busy || text.trim().length < 2} className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-7 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
              {busy && <Loader2 className="size-4 animate-spin" />} Send
            </button>
            {admin && (
              <label className="flex items-center gap-2 text-sm text-mute">
                <input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} className="size-4 accent-white" /> Close it after replying
              </label>
            )}
          </div>
        </div>
      )}
      {admin && (
        <div className="flex gap-3 border-t border-line pt-4 text-sm">
          {state === 'closed' ? (
            <button type="button" onClick={() => setStatus('open')} className="text-mute underline underline-offset-4 hover:text-paper">
              Reopen
            </button>
          ) : (
            <button type="button" onClick={() => setStatus('closed')} className="text-mute underline underline-offset-4 hover:text-paper">
              Close without replying
            </button>
          )}
        </div>
      )}
    </div>
  )
}
