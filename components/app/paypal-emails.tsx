'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, Mail, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { checkEmail, cleanEmail } from '@/lib/email-check'
import { EASE_OUT } from '@/lib/layout'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { AddEmailSheet } from './payout-flow'

export const MAX_PAYPAL_EMAILS = 5

type Saved = { emails: string[]; email: string }

async function call(method: 'POST' | 'DELETE', email: string, makeDefault?: boolean): Promise<Saved> {
  const res = await fetch('/api/me/paypal', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, ...(makeDefault === undefined ? {} : { makeDefault }) }) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; email?: string; emails?: string[] }
  if (!res.ok) throw new Error(j.error ?? 'Could not save that. Please try again.')
  return { emails: j.emails ?? [], email: j.email ?? '' }
}

/**
 * The PayPal emails someone is paid at: the saved ones (one is the default), and a way to add another that checks it as you type,
 * catches the usual typos, and shows the address back to be confirmed before anything is saved.
 * `pick` and `onPick` are for the withdraw form, where one of them is chosen for this payout; without them the list is just managed.
 */
export function PaypalEmails({ emails, defaultEmail, onChange, pick, onPick, autoFocus = false }: { emails: string[]; defaultEmail: string; onChange: (next: Saved) => void; pick?: string; onPick?: (email: string) => void; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const ceremony = useFeature('payout-ceremony')
  const [sheet, setSheet] = useState(false)

  const check = checkEmail(text)
  const full = emails.length >= MAX_PAYPAL_EMAILS
  const dup = check.ok && emails.includes(check.email)
  const problem = dup ? 'That one is already on your list.' : touched || check.ok ? check.problem : ''

  useEffect(() => {
    if (autoFocus && emails.length === 0) input.current?.focus()
  }, [autoFocus, emails.length])
  useEffect(() => {
    if (!fresh) return
    const t = window.setTimeout(() => setFresh(null), 2400)
    return () => window.clearTimeout(t)
  }, [fresh])

  const next = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    setError('')
    if (!check.ok || dup || busy) return
    setConfirming(check.email)
  }

  const add = async (email: string) => {
    setBusy('add')
    setError('')
    try {
      const r = await call('POST', email, emails.length === 0)
      onChange(r)
      onPick?.(email)
      setFresh(email)
      setText('')
      setTouched(false)
      setConfirming(null)
      toast.ok('PayPal email added')
    } catch (e) {
      setConfirming(null)
      setError(e instanceof Error ? e.message : 'Could not save that.')
    }
    setBusy(null)
  }

  const makeDefault = async (email: string) => {
    setBusy(email)
    try {
      onChange(await call('POST', email, true))
      toast.ok('Now your default')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change that.')
    }
    setBusy(null)
  }

  const remove = async (email: string) => {
    setBusy(email)
    try {
      const r = await call('DELETE', email)
      onChange(r)
      if (pick === email) onPick?.(r.email || r.emails[0] || '')
      toast.ok('Removed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that.')
    }
    setRemoving(null)
    setBusy(null)
  }

  return (
    <div className="grid gap-3">
      {emails.length > 0 && (
        <ul className="grid gap-2" {...(onPick ? { role: 'radiogroup', 'aria-label': 'PayPal email' } : {})}>
          {emails.map((e) => {
            const selected = onPick ? pick === e : false
            const isDefault = e === defaultEmail
            return (
              <li key={e} className={cn('rounded-panel border transition-colors duration-500', fresh === e ? 'border-paper/60 bg-white/[0.06]' : selected ? 'border-paper bg-white/[0.05]' : 'border-line-strong')}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {onPick ? (
                    <button type="button" role="radio" aria-checked={selected} onClick={() => onPick(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-pill border', selected ? 'border-paper bg-paper text-ink' : 'border-line-strong')}>{selected && <Check aria-hidden="true" className="size-3" />}</span>
                      <span className="truncate text-[15px]">{e}</span>
                    </button>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-[15px]">{e}</span>
                  )}
                  {isDefault && <span className="shrink-0 rounded-chip border border-line-strong px-2 py-0.5 text-[11px] text-mute">Default</span>}
                </div>
                <AnimatePresence initial={false} mode="wait">
                  {removing === e ? (
                    <motion.div key="sure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-sm">
                      <span className="flex-1 text-mute">Remove this email?</span>
                      <button type="button" disabled={busy === e} onClick={() => void remove(e)} className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-paper px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-60">
                        {busy === e && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />} Remove
                      </button>
                      <button type="button" onClick={() => setRemoving(null)} className="inline-flex h-8 items-center rounded-pill px-3 text-[13px] text-mute transition-colors hover:text-paper">
                        Keep it
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1 border-t border-line px-2 py-1.5">
                      {!isDefault && (
                        <button type="button" disabled={busy === e} onClick={() => void makeDefault(e)} className="inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-[13px] text-mute transition-colors hover:text-paper disabled:opacity-60">
                          {busy === e && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />} Make default
                        </button>
                      )}
                      <button type="button" onClick={() => setRemoving(e)} className="ml-auto inline-flex h-8 items-center rounded-pill px-3 text-[13px] text-mute transition-colors hover:text-paper">
                        Remove
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      )}

      {full ? (
        <p className="text-sm text-mute">You have {MAX_PAYPAL_EMAILS} PayPal emails, the most we keep. Remove one to add another.</p>
      ) : ceremony ? (
        <>
          <button type="button" onClick={() => setSheet(true)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-panel border border-dashed border-line-strong text-sm text-mute transition-colors hover:border-paper/40 hover:text-paper">
            <Plus aria-hidden="true" className="size-4" /> {emails.length ? 'Add another PayPal email' : 'Add your PayPal email'}
          </button>
          <p className="text-xs text-mute">Payouts are sent to an email you add here, and every new one is confirmed with a code.</p>
          <AddEmailSheet
            open={sheet}
            onClose={() => setSheet(false)}
            existing={emails}
            onAdded={(r, email) => {
              onChange(r)
              onPick?.(email)
              setFresh(email)
            }}
          />
        </>
      ) : (
        <AnimatePresence initial={false} mode="wait">
          {confirming ? (
            <motion.div key="confirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="rounded-panel border border-line-strong p-5">
              <p className="text-sm text-mute">Send your payouts to</p>
              <p className="mt-1 text-[clamp(1.15rem,4.4vw,1.5rem)] leading-snug font-medium tracking-[-0.01em] break-all">{confirming}</p>
              <p className="mt-3 text-sm leading-relaxed text-mute">Check it letter by letter, and make sure it is the email you sign in to PayPal with. Money sent to the wrong address goes to someone else and cannot be taken back.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" autoFocus disabled={busy === 'add'} onClick={() => void add(confirming)} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-60">
                  {busy === 'add' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Yes, that is right
                </button>
                <button
                  type="button"
                  disabled={busy === 'add'}
                  onClick={() => {
                    setConfirming(null)
                    window.setTimeout(() => input.current?.focus(), 50)
                  }}
                  className="inline-flex h-11 items-center rounded-pill border border-line-strong px-5 text-sm transition-colors hover:bg-white/[0.06]"
                >
                  Change it
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onSubmit={next} noValidate>
              <label htmlFor={`${id}-in`} className="mb-2 block text-sm text-mute">
                {emails.length ? 'Add another PayPal email' : 'Your PayPal email'}
              </label>
              <div className="flex gap-2">
                <span className="relative block min-w-0 flex-1">
                  <Mail aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-mute" />
                  <input
                    ref={input}
                    id={`${id}-in`}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="name@example.com"
                    value={text}
                    aria-invalid={Boolean(problem)}
                    aria-describedby={`${id}-hint`}
                    onChange={(e) => {
                      setText(e.target.value)
                      setError('')
                    }}
                    onPaste={(e) => {
                      // pasted with spaces, brackets or a full stop on the end: tidy it as it lands
                      const t = e.clipboardData.getData('text')
                      if (t && cleanEmail(t) !== t) {
                        e.preventDefault()
                        setText(cleanEmail(t))
                      }
                    }}
                    onBlur={() => text && setTouched(true)}
                    className={cn('h-12 w-full rounded-tile border bg-ink/75 pr-4 pl-11 text-[15px] transition-colors outline-none placeholder:text-mute focus:border-paper/60', problem ? 'border-signal/50' : 'border-line-strong')}
                  />
                </span>
                <button type="submit" disabled={Boolean(busy) || !check.ok || dup} className="inline-flex h-12 shrink-0 items-center rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
                  Add
                </button>
              </div>
              <div id={`${id}-hint`} aria-live="polite" className="mt-2 min-h-5 text-[13px] leading-snug">
                {check.ok && check.suggestion && !dup ? (
                  <span className="text-mute">
                    Did you mean{' '}
                    <button type="button" onClick={() => setText(check.suggestion ?? '')} className="text-paper underline underline-offset-4 hover:text-paper/80">
                      {check.suggestion}
                    </button>
                    ?
                  </span>
                ) : problem ? (
                  <span className="text-signal">{problem}</span>
                ) : check.ok ? (
                  <span className="inline-flex items-center gap-1.5 text-mute">
                    <Check aria-hidden="true" className="size-3.5" /> Looks like an email
                  </span>
                ) : (
                  <span className="text-mute">The email you sign in to PayPal with. No bank details needed.</span>
                )}
              </div>
              {error && (
                <p role="alert" className="mt-1 text-[13px] text-signal">
                  {error}
                </p>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
