'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Check, Copy, Loader2, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/fields'
import { HANDLE_CHANGES_PER_WEEK, waitWords, type HandleQuota } from '@/lib/handle-shared'
import { handleProblem } from '@/lib/profile-style'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Status = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'bad'; message: string; suggestions?: string[] }
type Check = { available?: boolean; same?: boolean; message?: string; suggestions?: string[]; quota?: HandleQuota }

const clean = (v: string, loose: boolean) => v.toLowerCase().replace(/^@/, '').replace(loose ? /[^a-z0-9_.-]/g : /[^a-z0-9_]/g, '')

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: 'no-store', ...init })
  const j = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok) throw new Error(j?.error ?? 'Something went wrong. Please try again.')
  return j as T
}

/**
 * Changing your username, as its own little moment. The name you have now sits above a row of two pips (the changes you have left this week),
 * "Change" opens an editor in place that checks the name as you type, offers free names close to it when it is taken, says what the change
 * costs, and only then switches it. It saves straight away, on its own, so it never waits behind the rest of the profile's Save.
 * The server holds the rules (two changes in any seven days, no reserved words, no one else's name); this only shows them early.
 */
export function UsernameChange({ handle, loose, onChanged }: { handle: string; loose: boolean; onChanged: (handle: string) => void }) {
  const reduced = useReducedMotion()
  const [quota, setQuota] = useState<HandleQuota | null>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(handle)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const seq = useRef(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let live = true
    call<{ quota: HandleQuota }>('/api/me/handle')
      .then((j) => live && setQuota(j.quota))
      .catch(() => null)
    return () => {
      live = false
    }
  }, [])

  // check the name 350 ms after the typing stops
  useEffect(() => {
    if (!open) return
    const v = clean(value, loose)
    const n = ++seq.current
    if (!v || v === handle) return setStatus({ kind: 'idle' })
    // the shape is checked here at once (the reserved words are left to the server, which knows whether this is an admin)
    const shape = handleProblem(v, { loose, isAdmin: true })
    if (shape) return setStatus({ kind: 'bad', message: shape })
    setStatus({ kind: 'checking' })
    const t = window.setTimeout(() => {
      call<Check>(`/api/me/handle?h=${encodeURIComponent(v)}`)
        .then((j) => {
          if (n !== seq.current) return
          if (j.quota) setQuota(j.quota)
          setStatus(j.available ? { kind: 'ok' } : { kind: 'bad', message: j.message ?? 'That username cannot be used.', suggestions: j.suggestions })
        })
        .catch((e: Error) => n === seq.current && setStatus({ kind: 'bad', message: e.message }))
    }, 350)
    return () => window.clearTimeout(t)
  }, [value, open, handle, loose])

  const left = quota?.left ?? HANDLE_CHANGES_PER_WEEK
  const max = quota?.max ?? HANDLE_CHANGES_PER_WEEK
  const locked = quota !== null && left === 0
  const wait = quota?.nextAt ? waitWords(quota.nextAt - Math.floor(Date.now() / 1000)) : ''
  const next = clean(value, loose)

  const begin = () => {
    setValue(handle)
    setStatus({ kind: 'idle' })
    setError('')
    setDone(null)
    setOpen(true)
    window.setTimeout(() => {
      input.current?.focus()
      input.current?.select() // typing replaces the name that is there
    }, 80)
  }
  const cancel = () => {
    setOpen(false)
    setError('')
  }
  const commit = async () => {
    if (status.kind !== 'ok' || saving) return
    setSaving(true)
    setError('')
    try {
      const j = await call<{ handle: string; quota: HandleQuota }>('/api/me/handle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: next }) })
      setQuota(j.quota)
      setDone(j.handle)
      onChanged(j.handle)
      toast.ok(`You are now @${j.handle}`)
      window.setTimeout(() => {
        setOpen(false)
        setDone(null)
      }, 2400)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change it.')
    } finally {
      setSaving(false)
    }
  }
  const copy = () => {
    void navigator.clipboard?.writeText(`https://logoless.io/@${handle}`).then(() => toast.ok('Link copied'))
  }

  const ease = [0.2, 0.8, 0.2, 1] as const

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-paper">Username</span>
        <span className="flex items-center gap-2 text-xs text-mute" title={`You can change it ${max} times in any 7 days`}>
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: max }, (_, i) => (
              <span key={i} className={cn('h-1.5 w-5 rounded-[2px] transition-colors duration-500', i < left ? 'bg-[var(--teal,#34d399)] shadow-[0_0_10px_rgb(46_208_176/0.55)]' : 'bg-white/15')} />
            ))}
          </span>
          {quota === null ? '' : locked ? `Again in ${wait}` : `${left} of ${max} changes left this week`}
        </span>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-white/[0.02]">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-display text-[1.6rem] leading-none" style={{ textTransform: 'none' }}>
              @{handle}
            </p>
            <button type="button" onClick={copy} className="mt-2 inline-flex items-center gap-1.5 text-xs text-mute transition-colors hover:text-paper">
              logoless.io/@{handle} <Copy aria-hidden="true" className="size-3" />
            </button>
          </div>
          {!open && (
            <button
              type="button"
              onClick={begin}
              disabled={locked}
              className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:border-paper/45 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:bg-transparent"
            >
              <Pencil aria-hidden="true" className="size-3.5" /> Change
            </button>
          )}
        </div>

        {locked && !open && (
          <p className="border-t border-line px-4 py-3 text-xs text-mute">
            You have used both changes this week{quota?.last ? `, the last one from @${quota.last.from} to @${quota.last.to}` : ''}. You can change it again in {wait}.
          </p>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="editor"
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduced ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease }}
              className="overflow-hidden"
            >
              <div className="border-t border-line p-4">
                {done ? (
                  <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="flex items-center gap-4 py-2">
                    <motion.span initial={reduced ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--teal,#34d399)] text-black">
                      <Check aria-hidden="true" className="size-5" strokeWidth={3} />
                    </motion.span>
                    <div>
                      <p className="font-display text-xl leading-none" style={{ textTransform: 'none' }}>
                        You are now @{done}
                      </p>
                      <p className="mt-1.5 text-xs text-mute">logoless.io/@{done} is your link from now on.</p>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <label htmlFor="new-username" className="mb-2 block text-xs text-mute">
                      Pick a new username
                    </label>
                    <div className="relative">
                      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-paper/50">
                        @
                      </span>
                      <Input
                        id="new-username"
                        ref={input}
                        value={value}
                        maxLength={20}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        aria-describedby="new-username-status"
                        aria-invalid={status.kind === 'bad'}
                        onChange={(e) => setValue(clean(e.target.value, loose))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.preventDefault(), void commit())
                          if (e.key === 'Escape') cancel()
                        }}
                        className={cn('h-12 rounded-tile pr-11 pl-9', status.kind === 'bad' && 'border-signal/60', status.kind === 'ok' && 'border-[var(--teal,#34d399)]/60')}
                      />
                      <span aria-hidden="true" className="absolute inset-y-0 right-3.5 grid place-items-center">
                        {status.kind === 'checking' && <Loader2 className="size-4 animate-spin text-mute" />}
                        {status.kind === 'ok' && <Check className="size-4 text-[var(--teal,#34d399)]" strokeWidth={3} />}
                        {status.kind === 'bad' && <AlertCircle className="size-4 text-signal" />}
                      </span>
                    </div>
                    <p id="new-username-status" role="status" aria-live="polite" className={cn('mt-2 min-h-5 text-xs', status.kind === 'bad' ? 'text-signal' : status.kind === 'ok' ? 'text-[var(--teal,#34d399)]' : 'text-mute')}>
                      {status.kind === 'checking' && 'Checking…'}
                      {status.kind === 'ok' && `@${next} is free. It can be yours.`}
                      {status.kind === 'bad' && status.message}
                      {status.kind === 'idle' && (value && clean(value, loose) === handle ? 'That is the one you have now.' : loose ? 'Letters, numbers, dots, dashes and underscores, 3 to 20.' : 'Letters, numbers and underscores, 3 to 20.')}
                    </p>

                    {status.kind === 'bad' && status.suggestions && status.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-mute">Free right now:</span>
                        {status.suggestions.map((s) => (
                          <button key={s} type="button" onClick={() => setValue(s)} className="h-8 rounded-pill border border-line-strong px-3 text-xs transition-colors hover:border-[var(--teal,#34d399)]/60 hover:text-[var(--teal,#34d399)]">
                            @{s}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 rounded-tile border border-line bg-white/[0.02] px-3.5 py-3 text-xs leading-relaxed text-mute">
                      This uses one of your {max} changes for the week, and you have {left} left. Your old link, logoless.io/@{handle}, stops working and someone else can take that name.
                    </div>

                    {error && (
                      <p role="alert" className="mt-3 text-xs text-signal">
                        {error}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                      <button type="button" onClick={cancel} className="h-10 rounded-pill px-4 text-sm text-mute transition-colors hover:text-paper">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void commit()}
                        disabled={status.kind !== 'ok' || saving}
                        className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                        {status.kind === 'ok' ? `Change to @${next}` : 'Change username'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
