'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Loader2, Plus, ShieldCheck, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { checkEmail, cleanEmail } from '@/lib/email-check'
import { cents, withdraw } from '@/lib/finance-client'
import { EASE_OUT } from '@/lib/layout'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Saved = { emails: string[]; email: string }

const maskEmail = (e: string) => e.replace(/^(.{1,2}).*(@.*)$/, '$1***$2')

async function post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('/api/me/paypal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong. Please try again.')
  return j
}

/** A window for one thing that matters: dim page behind, steps along the top, Escape closes it unless it is busy. */
function Sheet({ open, onClose, steps, step, title, busy = false, children }: { open: boolean; onClose: () => void; steps: number; step: number; title: string; busy?: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const labelId = useId()
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const lock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = lock
      window.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [open, busy, onClose])
  useEffect(() => {
    if (open) requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus())
  }, [open, step])
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[210] grid place-items-end bg-black/80 p-3 backdrop-blur-sm sm:place-items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: 14, scale: 0.98, transition: { duration: 0.18 } }}
            className="max-h-[94dvh] w-full max-w-[30rem] overflow-y-auto rounded-card border border-line-strong bg-[#0d0d0f] p-5 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.95)] sm:p-8"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex flex-1 gap-1.5" aria-hidden="true">
                {Array.from({ length: steps }, (_, i) => (
                  <span key={i} className="h-1 flex-1 overflow-hidden rounded-pill bg-white/10">
                    <span className="block h-full rounded-pill bg-paper transition-[width] duration-500" style={{ width: i <= step ? '100%' : '0%' }} />
                  </span>
                ))}
              </div>
              <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="-mr-1 grid size-9 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper disabled:opacity-40">
                <X className="size-4" />
              </button>
            </div>
            <h2 id={labelId} className="font-sans text-[22px] leading-tight font-medium tracking-[-0.015em]">
              {title}
            </h2>
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

const primary = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40'
const quiet = 'inline-flex h-11 items-center justify-center rounded-pill px-4 text-sm text-mute transition-colors hover:text-paper'
const field = 'h-14 w-full rounded-tile border bg-ink/75 px-4 text-[17px] outline-none transition-colors placeholder:text-mute focus:border-paper/60'

/** A tick that draws itself. */
function Tick() {
  return (
    <span className="mx-auto grid size-16 place-items-center rounded-pill border border-line-strong">
      <svg viewBox="0 0 24 24" className="size-8 text-paper" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <motion.path d="M5 12.5l4.2 4.2L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }} />
      </svg>
    </span>
  )
}

/**
 * Adding a PayPal email, one step at a time: type it, type it again (no pasting), then confirm it with a code emailed to the account.
 * A payout can only go to an email that went through this.
 */
export function AddEmailSheet({ open, onClose, existing, onAdded }: { open: boolean; onClose: () => void; existing: string[]; onAdded: (r: Saved, email: string) => void }) {
  const [step, setStep] = useState<'enter' | 'again' | 'code' | 'done'>('enter')
  const [text, setText] = useState('')
  const [again, setAgain] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [wait, setWait] = useState(0)
  const c = checkEmail(text)
  const dup = c.ok && existing.includes(c.email)

  // every time it opens it starts again from the top
  useEffect(() => {
    if (!open) return
    setStep('enter')
    setText('')
    setAgain('')
    setCode('')
    setError('')
    setBusy(false)
    setWait(0)
  }, [open])
  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const j = await post({ action: 'send', email: c.email })
      setSentTo(String(j.sentTo ?? ''))
      setWait(30)
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not send the code.')
    }
    setBusy(false)
  }

  const confirm = useCallback(
    async (value: string) => {
      if (busy) return
      setBusy(true)
      setError('')
      try {
        const j = await post({ email: c.email, code: value, makeDefault: existing.length === 0 })
        onAdded({ emails: (j.emails as string[]) ?? [], email: String(j.email ?? '') }, c.email)
        setStep('done')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That code did not work.')
        setCode('')
      }
      setBusy(false)
    },
    [busy, c.email, existing.length, onAdded],
  )

  const same = cleanEmail(again) === c.email
  const index = { enter: 0, again: 1, code: 2, done: 3 }[step]

  return (
    <Sheet open={open} onClose={onClose} steps={4} step={index} busy={busy} title={{ enter: 'Add a PayPal email', again: 'Check it carefully', code: 'Confirm it is you', done: 'PayPal email added' }[step]}>
      {step === 'enter' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (c.ok && !dup) setStep('again')
          }}
          noValidate
        >
          <p className="text-sm leading-relaxed text-mute">Payouts are sent to this email, so it has to be the one you sign in to PayPal with. It takes a minute and a code, because this is where your money goes.</p>
          <input data-autofocus type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="name@example.com" value={text} onChange={(e) => setText(e.target.value)} aria-label="PayPal email" className={cn('mt-5', field, c.problem && text ? 'border-signal/50' : 'border-line-strong')} />
          <div aria-live="polite" className="mt-2 min-h-5 text-[13px]">
            {c.ok && c.suggestion && !dup ? (
              <span className="text-mute">
                Did you mean{' '}
                <button type="button" onClick={() => setText(c.suggestion ?? '')} className="text-paper underline underline-offset-4">
                  {c.suggestion}
                </button>
                ?
              </span>
            ) : dup ? (
              <span className="text-signal">That one is already on your list.</span>
            ) : c.problem && text ? (
              <span className="text-signal">{c.problem}</span>
            ) : null}
          </div>
          <button type="submit" disabled={!c.ok || dup} className={cn('mt-5', primary)}>
            Continue
          </button>
        </form>
      )}

      {step === 'again' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (same) void send()
          }}
          noValidate
        >
          <p className="text-sm text-mute">You are adding</p>
          <p className="mt-1 text-[clamp(1.2rem,5vw,1.6rem)] leading-snug font-medium tracking-[-0.01em] break-all">{c.email}</p>
          <p className="mt-4 text-sm leading-relaxed text-mute">Type it again to be sure. Money sent to a wrong address goes to someone else and cannot be taken back.</p>
          <input data-autofocus type="text" inputMode="email" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Type it again" value={again} onChange={(e) => setAgain(e.target.value)} onPaste={(e) => e.preventDefault()} onDrop={(e) => e.preventDefault()} aria-label="Type the email again" className={cn('mt-4', field, again && !same ? 'border-line-strong' : same ? 'border-paper/60' : 'border-line-strong')} />
          <div aria-live="polite" className="mt-2 min-h-5 text-[13px] text-mute">
            {again && same ? (
              <span className="inline-flex items-center gap-1.5">
                <Check aria-hidden="true" className="size-3.5" /> They match
              </span>
            ) : (
              'Type it, do not paste it.'
            )}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[13px] text-signal">
              {error}
            </p>
          )}
          <button type="submit" disabled={!same || busy} className={cn('mt-5', primary)}>
            {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Email me a code
          </button>
          <button type="button" onClick={() => (setStep('enter'), setAgain(''), setError(''))} className={cn('mt-1 w-full', quiet)}>
            <ArrowLeft aria-hidden="true" className="mr-1.5 size-4" /> Change it
          </button>
        </form>
      )}

      {step === 'code' && (
        <div>
          <p className="text-sm leading-relaxed text-mute">
            We sent a 6 digit code to <span className="text-paper">{sentTo || 'your account email'}</span>. It works for 10 minutes. This keeps anyone else from pointing your payouts at their own PayPal.
          </p>
          <input
            data-autofocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(v)
              setError('')
              if (v.length === 6) void confirm(v)
            }}
            aria-label="6 digit code"
            className={cn('mt-5 text-center font-mono tracking-[0.5em]', field, error ? 'border-signal/50' : 'border-line-strong')}
          />
          <div aria-live="polite" className="mt-2 min-h-5 text-center text-[13px]">
            {busy ? <span className="text-mute">Checking…</span> : error ? <span className="text-signal">{error}</span> : null}
          </div>
          <button type="button" disabled={wait > 0 || busy} onClick={() => void send()} className={cn('mt-3 w-full', quiet)}>
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center">
          <Tick />
          <p className="mt-5 text-[clamp(1.1rem,4.6vw,1.4rem)] leading-snug font-medium break-all">{c.email}</p>
          <p className="mt-2 text-sm leading-relaxed text-mute">{existing.length === 0 ? 'This is where your payouts will go.' : 'You can pick it when you withdraw.'} We also sent a notice to your account email, so you will know if anyone else ever adds one.</p>
          <button type="button" data-autofocus onClick={onClose} className={cn('mt-6', primary)}>
            Done
          </button>
        </div>
      )}
    </Sheet>
  )
}

/** A button you press and hold. A bar fills while you hold it, and letting go early starts again. Space and Enter hold it too. */
function HoldButton({ label, onComplete, disabled, ms = 1300 }: { label: string; onComplete: () => void; disabled?: boolean; ms?: number }) {
  const [p, setP] = useState(0)
  const raf = useRef(0)
  const start = useRef(0)
  const done = useRef(false)
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    start.current = 0
    setP(0)
  }, [])
  const begin = useCallback(() => {
    if (disabled || start.current || done.current) return
    start.current = performance.now()
    const tick = (t: number) => {
      const v = Math.min(1, (t - start.current) / ms)
      setP(v)
      if (v >= 1) {
        done.current = true
        onComplete()
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [disabled, ms, onComplete])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  useEffect(() => {
    if (disabled) stop()
  }, [disabled, stop])
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        begin()
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault()
          begin()
        }
      }}
      onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
      aria-describedby="hold-hint"
      className="relative inline-flex h-14 w-full touch-none items-center justify-center overflow-hidden rounded-pill bg-white/[0.08] text-[15px] font-medium text-paper outline-none select-none focus-visible:ring-2 focus-visible:ring-paper disabled:opacity-40"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-paper" style={{ width: `${p * 100}%` }} />
      <span className="relative mix-blend-difference">{p > 0 && p < 1 ? 'Keep holding…' : label}</span>
    </button>
  )
}

/**
 * Withdrawing as a short ceremony: how much, where to, a review of exactly what will happen, then press and hold to send,
 * and a receipt. Nothing is sent by a single click.
 */
export function WithdrawSheet({ open, onClose, availableCents, minCents, emails, defaultEmail, initialPick, onSent, onSaved }: { open: boolean; onClose: () => void; availableCents: number; minCents: number; emails: string[]; defaultEmail: string; initialPick: string; onSent: () => void; onSaved: (r: Saved, email: string) => void }) {
  const [step, setStep] = useState<'amount' | 'to' | 'review' | 'sent'>('amount')
  const [amount, setAmount] = useState('')
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [result, setResult] = useState<{ amount: number; review: boolean } | null>(null)

  // it starts again from the top each time it opens (not when the list of emails changes underneath it)
  const start = useRef({ initialPick, defaultEmail, emails })
  start.current = { initialPick, defaultEmail, emails }
  useEffect(() => {
    if (!open) return
    setStep('amount')
    setAmount('')
    setError('')
    setBusy(false)
    setResult(null)
    setPick(start.current.initialPick || start.current.defaultEmail || start.current.emails[0] || '')
  }, [open])

  const value = amount.trim() === '' ? availableCents : Math.round(Number(amount) * 100)
  const valid = Number.isFinite(value) && value >= minCents && value <= availableCents
  const after = availableCents - (valid ? value : 0)
  const index = { amount: 0, to: 1, review: 2, sent: 3 }[step]

  const send = useCallback(async () => {
    if (busy || !valid || !pick) return
    setBusy(true)
    setError('')
    try {
      const r = await withdraw(pick, amount.trim() === '' ? undefined : value / 100)
      setResult({ amount: r.amount, review: Boolean(r.review) })
      setStep('sent')
      onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The withdrawal did not go through. Your balance has not changed.')
    }
    setBusy(false)
  }, [busy, valid, pick, amount, value, onSent])

  const quick = [10, 25, 50, 100].filter((v) => v * 100 >= minCents && v * 100 < availableCents)

  return (
    <>
      <Sheet open={open && !adding} onClose={onClose} steps={4} step={index} busy={busy} title={{ amount: 'How much?', to: 'Where should it go?', review: 'Review your payout', sent: result?.review ? 'Payout received, being checked' : 'Payout on its way' }[step]}>
        {step === 'amount' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) setStep('to')
            }}
          >
            <div className="rounded-panel border border-line-strong px-5 py-6 text-center">
              <label htmlFor="payout-amount" className="sr-only">
                Amount in dollars
              </label>
              <div className="flex items-baseline justify-center gap-1 font-display text-[clamp(2.6rem,12vw,3.6rem)] leading-none tabular-nums">
                <span className="text-paper/40">$</span>
                <input id="payout-amount" data-autofocus inputMode="decimal" autoComplete="off" placeholder={(availableCents / 100).toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 9))} className="w-[7ch] bg-transparent text-center outline-none placeholder:text-paper/25" />
              </div>
              <p className="mt-3 text-sm text-mute">
                {amount.trim() === '' ? `All of it, ${cents(availableCents)}` : valid ? `${cents(after)} stays in your balance` : value > availableCents ? `You have ${cents(availableCents)} available` : `The smallest withdrawal is ${cents(minCents)}`}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Quick amounts">
              <button type="button" aria-pressed={amount.trim() === ''} onClick={() => setAmount('')} className={cn('h-9 rounded-pill border px-4 text-sm transition-colors', amount.trim() === '' ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                All
              </button>
              {quick.map((v) => (
                <button key={v} type="button" aria-pressed={amount === String(v)} onClick={() => setAmount(String(v))} className={cn('h-9 rounded-pill border px-4 text-sm transition-colors', amount === String(v) ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                  ${v}
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-mute">We pay PayPal&apos;s fee, so the whole amount arrives.</p>
            <button type="submit" disabled={!valid} className={cn('mt-5', primary)}>
              Continue
            </button>
          </form>
        )}

        {step === 'to' && (
          <div>
            <p className="text-sm text-mute">Choose the PayPal email to send {cents(valid ? value : 0)} to.</p>
            <ul className="mt-4 grid gap-2" role="radiogroup" aria-label="PayPal email">
              {emails.map((e) => (
                <li key={e}>
                  <button type="button" role="radio" aria-checked={pick === e} onClick={() => setPick(e)} className={cn('flex w-full items-center gap-3 rounded-panel border px-4 py-3.5 text-left transition-colors', pick === e ? 'border-paper bg-white/[0.05]' : 'border-line-strong hover:border-paper/40')}>
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded-pill border', pick === e ? 'border-paper bg-paper text-ink' : 'border-line-strong')}>{pick === e && <Check aria-hidden="true" className="size-3" />}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px]">{e}</span>
                    {e === defaultEmail && <span className="shrink-0 rounded-chip border border-line-strong px-2 py-0.5 text-[11px] text-mute">Default</span>}
                  </button>
                </li>
              ))}
            </ul>
            {emails.length < 5 && (
              <button type="button" onClick={() => setAdding(true)} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel border border-dashed border-line-strong text-sm text-mute transition-colors hover:border-paper/40 hover:text-paper">
                <Plus aria-hidden="true" className="size-4" /> Add a PayPal email
              </button>
            )}
            <button type="button" disabled={!pick} onClick={() => setStep('review')} className={cn('mt-5', primary)}>
              Continue
            </button>
            <button type="button" onClick={() => setStep('amount')} className={cn('mt-1 w-full', quiet)}>
              <ArrowLeft aria-hidden="true" className="mr-1.5 size-4" /> Change the amount
            </button>
          </div>
        )}

        {step === 'review' && (
          <div>
            <div className="rounded-panel border border-line-strong p-5">
              <p className="text-sm text-mute">You are sending</p>
              <p className="mt-1 font-display text-[clamp(2.4rem,11vw,3.2rem)] leading-none tabular-nums">{cents(value)}</p>
              <p className="mt-5 text-sm text-mute">To this PayPal email</p>
              <p className="mt-1 text-[clamp(1.05rem,4.4vw,1.3rem)] leading-snug font-medium break-all">{pick}</p>
              <dl className="mt-5 grid gap-2.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-mute">PayPal fee</dt>
                  <dd>We cover it</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-mute">Left in your balance</dt>
                  <dd className="tabular-nums">{cents(after)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-mute">Arrives</dt>
                  <dd className="text-right">Usually within minutes</dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 flex gap-2.5 text-[13px] leading-relaxed text-mute">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>A payout cannot be taken back once PayPal has it. Check the email letter by letter. Some payouts are looked over first, which takes under a day.</span>
            </p>
            {error && (
              <p role="alert" className="mt-3 text-[13px] text-signal">
                {error}
              </p>
            )}
            <div className="mt-5">
              <HoldButton label={busy ? 'Sending…' : `Hold to send ${cents(value)}`} disabled={busy} onComplete={() => void send()} />
              <p id="hold-hint" className="mt-2 text-center text-xs text-mute">
                Press and hold the button for a moment. With a keyboard, hold Space.
              </p>
            </div>
            <button type="button" disabled={busy} onClick={() => setStep('to')} className={cn('mt-1 w-full', quiet)}>
              <ArrowLeft aria-hidden="true" className="mr-1.5 size-4" /> Change the email
            </button>
          </div>
        )}

        {step === 'sent' && result && (
          <div className="text-center">
            <Tick />
            <p className="mt-5 font-display text-[clamp(2.2rem,10vw,3rem)] leading-none tabular-nums">{cents(result.amount)}</p>
            <p className="mt-2 text-sm text-mute">to</p>
            <p className="mt-1 text-[clamp(1rem,4.2vw,1.2rem)] leading-snug font-medium break-all">{pick}</p>
            <p className="mt-4 text-sm leading-relaxed text-mute">{result.review ? 'We look over some payouts before they go out. It will be sent as soon as it is cleared, usually within a day.' : 'It is on its way and usually arrives within minutes.'} A receipt is on its way to your account email, and you will see it in your withdrawals.</p>
            <button type="button" data-autofocus onClick={onClose} className={cn('mt-6', primary)}>
              Done
            </button>
          </div>
        )}
      </Sheet>

      <AddEmailSheet
        open={open && adding}
        onClose={() => setAdding(false)}
        existing={emails}
        onAdded={(r, email) => {
          onSaved(r, email)
          setPick(email)
          toast.ok('PayPal email added')
        }}
      />
    </>
  )
}
