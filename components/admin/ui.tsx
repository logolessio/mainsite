'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { runSiteCheck } from '@/lib/site-check-client'
import { toast } from '@/lib/toast'
import { askAdminSecret } from './secret-dialog'

/** A button that posts JSON to an admin route, then refreshes the page. Shows the server's error if it fails. */
export function AdminButton({
  url,
  data,
  children,
  variant = 'ghost',
  confirm,
  ask,
  secret,
  className,
  onDone,
  hotkey,
}: {
  url: string
  data: Record<string, unknown>
  children: React.ReactNode
  variant?: 'solid' | 'ghost' | 'danger'
  confirm?: string
  /** Asks for a short typed reason first; it is sent as `note` (or the key you pass). */
  ask?: { label: string; key?: string; required?: boolean }
  /** Needs the admin password before it runs: use it for anything that could hurt the company. */
  secret?: string | boolean
  className?: string
  onDone?: (j: unknown) => void
  /** A single letter that presses this button while its row has keyboard focus. */
  hotkey?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const run = async (extra?: Record<string, unknown>) => {
    if (confirm && !window.confirm(confirm)) return
    let pass: string | null = null
    if (secret) {
      pass = await askAdminSecret(typeof secret === 'string' ? secret : undefined)
      if (!pass) return
    }
    setBusy(true)
    setError('')
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, ...extra, ...(pass ? { secret: pass } : {}) }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string } | undefined
    setBusy(false)
    if (!res?.ok) return setError(j?.error ?? 'Something went wrong.')
    setOpen(false)
    setText('')
    if (secret) runSiteCheck(typeof children === 'string' ? children : 'an admin action')
    toast.ok('Done')
    onDone?.(j)
    router.refresh()
  }

  const cls = cn(
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-pill px-4 text-xs transition-colors disabled:opacity-40',
    variant === 'solid' && 'bg-paper font-medium text-ink hover:bg-paper/85',
    variant === 'ghost' && 'border border-line-strong hover:bg-paper/10',
    variant === 'danger' && 'border border-signal/50 text-signal hover:bg-signal/10',
    className,
  )

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {ask && open ? (
        <span className="flex items-center gap-1.5">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ask.label}
            maxLength={280}
            className="h-9 w-56 rounded-pill border border-line-strong bg-ink/80 px-3 text-xs focus:outline-none"
          />
          <button type="button" disabled={busy || (ask.required && text.trim().length < 3)} onClick={() => run({ [ask.key ?? 'note']: text.trim() })} className={cls}>
            {busy && <Loader2 className="size-3 animate-spin" />} Confirm
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-mute hover:text-paper">
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" disabled={busy} onClick={() => (ask ? setOpen(true) : run())} className={cls} {...(hotkey ? { 'data-key': hotkey, 'data-key-label': typeof children === 'string' ? children : undefined, 'aria-keyshortcuts': hotkey } : {})}>
          {busy && <Loader2 className="size-3 animate-spin" />}
          {children}
          {hotkey && <kbd aria-hidden="true" className="kb-hint ml-1 rounded border border-current/30 px-1 font-mono text-[10px] opacity-70">{hotkey}</kbd>}
        </button>
      )}
      {error && <span role="alert" className="max-w-64 text-[11px] text-signal">{error}</span>}
    </span>
  )
}

export function Pill({ label, value, note, tone = 'neutral' }: { label: string; value: string; note?: string; tone?: 'neutral' | 'good' }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col justify-center rounded-[calc(40px*var(--round,1))] border px-7 py-5', tone === 'good' ? 'border-emerald-400/30 bg-emerald-400/[0.04]' : 'border-line-strong bg-surface/80')}>
      <p className="font-mono text-xs text-mute">{label}</p>
      <p className="mt-1 font-display text-5xl leading-none md:text-6xl">{value}</p>
      {note && <p className="mt-2 text-xs text-mute">{note}</p>}
    </div>
  )
}
