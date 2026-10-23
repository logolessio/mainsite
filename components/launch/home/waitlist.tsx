'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Loader2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OtpInput } from '@/components/auth/email-ui'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { signInWithProvider } from '@/lib/auth'
import { ensureHuman } from '@/lib/human-client'
import { normHandle, type PageCopy, WAITLIST_HANDLE_RE } from '@/lib/launch-page'
import { cn } from '@/lib/utils'
import { fingerprint } from './fingerprint'
import s from './launch-home.module.css'

const EASE = [0.22, 1, 0.36, 1] as const

/** Grows and shrinks smoothly to whatever is inside it. */
export function AutoHeight({ children, className, margin = 24 }: { children: React.ReactNode; className?: string; /** how far past its edges what is inside may still show (a glow), in pixels */ margin?: number }) {
  const inner = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<number | 'auto'>('auto')
  const { reduced } = useMotionPrefs()
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <motion.div className={cn('relative', className)} initial={false} animate={{ height: h }} transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }} style={{ overflow: 'clip', overflowClipMargin: margin }}>
      <div ref={inner}>{children}</div>
    </motion.div>
  )
}

type Step = 'email' | 'code' | 'handle' | 'done' | 'owner'

async function post<T>(data: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/launch/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong. Please try again.')
  return j
}

const step = {
  initial: { opacity: 0, y: 16, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(8px)' },
  transition: { duration: 0.45, ease: EASE },
}

/** Only the characters a username may have, as the person types. */
const typedHandle = (v: string) => v.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '').replace(/\.{2,}/g, '.').slice(0, 20)

/**
 * The waitlist sign-up: an email, the six-digit code sent to it, then a username to hold. A confirmation email follows, with a
 * one-click unsubscribe. `preview` is the owner's editor: it shows the steps without sending anything.
 */
export function Waitlist({ copy, autoFocus = false, preview = null }: { copy: PageCopy; autoFocus?: boolean; preview?: Step | null }) {
  const [stepNow, setStep] = useState<Step>('email')
  const at = preview ?? stepNow
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [proof, setProof] = useState('')
  const [mine, setMine] = useState<string | null>(null)
  const [handle, setHandle] = useState('')
  const [avail, setAvail] = useState<{ ok: boolean; problem?: string } | 'checking' | null>(null)
  const [result, setResult] = useState<{ handle: string | null; position: number | null; already: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)
  const handleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])
  useEffect(() => {
    if (autoFocus && at === 'email') emailRef.current?.focus({ preventScroll: true })
    if (at === 'handle') handleRef.current?.focus({ preventScroll: true })
  }, [at, autoFocus])

  // is the username free? asked while typing, a moment after the last key
  useEffect(() => {
    if (at !== 'handle') return
    const h = normHandle(handle)
    if (!h) return setAvail(null)
    if (mine && h === mine) return setAvail({ ok: true })
    if (!WAITLIST_HANDLE_RE.test(h)) {
      setAvail(h.length < 1 ? null : { ok: false, problem: /^\.+$/.test(h) ? 'Add a letter, number or underscore.' : h.includes('..') ? 'Two dots cannot come in a row.' : 'That is not a valid username.' })
      return
    }
    setAvail('checking')
    const ctl = new AbortController()
    const t = window.setTimeout(
      () =>
        fetch(`/api/launch/waitlist?h=${encodeURIComponent(h)}`, { signal: ctl.signal })
          .then((r) => r.json())
          .then((j) => setAvail(j as { ok: boolean; problem?: string }))
          .catch(() => undefined),
      280,
    )
    return () => {
      ctl.abort()
      window.clearTimeout(t)
    }
  }, [handle, at, mine])

  const run = async (fn: () => Promise<void>) => {
    if (busy || preview) return
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const start = (e?: React.FormEvent) => {
    e?.preventDefault()
    const addr = email.trim()
    if (!addr) return
    void run(async () => {
      await ensureHuman() // Cloudflare Turnstile; skipped until its keys are added
      const j = await post<{ sent?: boolean; owner?: boolean }>({ step: 'start', email: addr, fp: await fingerprint() })
      if (j.owner) {
        // the owner's own address: they are let in past the coming-soon page, so they sign in instead of joining
        setStep('owner')
        await signInWithProvider('google', undefined, '/', addr).catch((err) => {
          setStep('email')
          throw err
        })
        return
      }
      setCode('')
      setCooldown(30)
      setStep('code')
    })
  }

  const resend = () =>
    void run(async () => {
      await post({ step: 'start', email: email.trim(), fp: await fingerprint() })
      setCooldown(30)
    })

  const verify = (value: string) =>
    void run(async () => {
      try {
        const j = await post<{ proof: string; handle: string | null; already: boolean }>({ step: 'verify', email: email.trim(), code: value })
        setProof(j.proof)
        setMine(j.handle)
        setHandle(j.handle ?? '')
        setStep('handle')
      } catch (e) {
        setCode('')
        throw e
      }
    })

  const finish = (e: React.FormEvent) => {
    e.preventDefault()
    const h = normHandle(handle)
    if (!h) return
    void run(async () => {
      const j = await post<{ handle: string | null; position: number | null; already: boolean }>({ step: 'finish', email: email.trim(), proof, handle: h, fp: await fingerprint() })
      setResult(j)
      setStep('done')
    })
  }

  const handleOk = avail !== null && avail !== 'checking' && avail.ok
  const field = 'h-12 min-w-0 flex-1 bg-transparent text-[16px] text-paper outline-none placeholder:text-paper/40 md:text-[17px]'
  const cta = 'relative inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-[var(--acc)] px-5 text-[15px] font-medium text-[var(--on-acc)] transition-[transform,opacity,filter] duration-300 hover:brightness-110 active:scale-[0.97] disabled:opacity-45 md:px-6'
  const shownEmail = email.trim() || 'you@example.com'

  return (
    <AutoHeight className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {at === 'email' || at === 'owner' ? (
          <motion.form key="email" {...step} onSubmit={start} noValidate>
            <div className={cn(s.glass, 'flex items-center gap-2 rounded-pill py-1.5 pr-1.5 pl-5 transition-[border-color,box-shadow] duration-300 focus-within:border-[rgb(var(--acc-rgb)/0.45)] focus-within:shadow-[0_0_0_4px_rgb(var(--acc-rgb)/0.08)] md:pl-6')}>
              <input
                ref={emailRef}
                data-bare
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder={copy.emailPlaceholder}
                aria-label={copy.emailPlaceholder}
                autoComplete="email"
                disabled={at === 'owner'}
                className={field}
              />
              <button type="submit" disabled={busy || at === 'owner'} className={cta}>
                {busy || at === 'owner' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                <span>{at === 'owner' ? 'Opening Google' : copy.sendLabel}</span>
                {!busy && at !== 'owner' && <ArrowRight className="size-4" aria-hidden="true" />}
              </button>
            </div>
            <Note error={error} hint="We will NEVER sell your data or send you anything you wouldn't want to know about." />
          </motion.form>
        ) : at === 'code' ? (
          <motion.div key="code" {...step} className="flex flex-col items-center">
            <p className="mb-4 text-[15px] text-paper/65">
              We sent a code to <span className="text-paper">{shownEmail}</span>
            </p>
            <div className="w-full">
              <OtpInput
                value={code}
                disabled={busy}
                onChange={(v) => {
                  setCode(v)
                  setError('')
                  if (v.length === 6) verify(v)
                }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-[13.5px] text-paper/50">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              <button type="button" onClick={resend} disabled={cooldown > 0 || busy} className="underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper disabled:no-underline disabled:opacity-60">
                {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send it again'}
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => (setStep('email'), setError(''))} className="underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper">
                Change email
              </button>
            </div>
            <Note error={error} />
          </motion.div>
        ) : at === 'handle' ? (
          <motion.form key="handle" {...step} onSubmit={finish} noValidate>
            <p className="mb-4 text-center text-[15px] text-paper/65">{mine ? 'Welcome back. Keep your username, or pick a new one.' : 'Confirmed. Now pick the username you want on logoless.'}</p>
            <div className={cn(s.glass, 'flex items-center gap-1 rounded-pill py-1.5 pr-1.5 pl-5 transition-[border-color,box-shadow] duration-300 focus-within:border-[rgb(var(--acc-rgb)/0.45)] focus-within:shadow-[0_0_0_4px_rgb(var(--acc-rgb)/0.08)] md:pl-6')}>
              <span className="text-[17px] text-paper/45" aria-hidden="true">
                @
              </span>
              <input
                ref={handleRef}
                data-bare
                value={handle}
                onChange={(e) => {
                  setHandle(typedHandle(e.target.value))
                  setError('')
                }}
                placeholder="yourname"
                aria-label="The username to reserve"
                aria-describedby="wl-handle-note"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                className={field}
              />
              <span aria-live="polite" className="shrink-0 pr-1">
                {avail === 'checking' ? (
                  <Loader2 className="size-4 animate-spin text-paper/40" aria-label="Checking" />
                ) : avail?.ok ? (
                  <span className="flex items-center gap-1 text-[13px] text-emerald-300">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    {mine && normHandle(handle) === mine ? 'yours' : 'free'}
                  </span>
                ) : avail ? (
                  <span className="flex items-center gap-1 text-[13px] text-red-300">
                    <X className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    taken
                  </span>
                ) : null}
              </span>
              <button type="submit" disabled={busy || !handleOk} className={cta}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {copy.reserveLabel}
              </button>
            </div>
            <Note id="wl-handle-note" error={error || (avail && avail !== 'checking' && !avail.ok ? (avail.problem ?? '') : '')} hint="1 to 20 letters, numbers, dots or underscores. It is held for you until we open." />
          </motion.form>
        ) : (
          <motion.div key="done" {...step} className="flex flex-col items-center text-center">
            <div className="relative mb-5 grid size-16 place-items-center rounded-full bg-[var(--acc)] text-[var(--on-acc)]">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} aria-hidden="true" className={s.spark} style={{ '--a': `${i * 36}deg` } as React.CSSProperties} />
              ))}
              <svg viewBox="0 0 24 24" className={cn(s.tick, 'size-7')} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <p className="font-display text-[clamp(1.7rem,4vw,2.4rem)] leading-tight">{copy.doneTitle}</p>
            {(result?.handle ?? (preview ? 'yourname' : null)) && (
              <p className="mt-2 text-[17px] text-paper/75">
                <span className="text-paper">@{result?.handle ?? 'yourname'}</span> is yours.
              </p>
            )}
            {(result?.position ?? (preview ? 1284 : null)) ? <p className="mt-1 text-[14px] text-paper/50">Number {(result?.position ?? 1284).toLocaleString('en-US')} on the list.</p> : result?.already ? <p className="mt-1 text-[14px] text-paper/50">You were already on the list.</p> : null}
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-paper/45">
              We sent a confirmation to {shownEmail}. It lists what you signed up with and has a one-click unsubscribe link.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AutoHeight>
  )
}

function Note({ error, hint, id }: { error: string; hint?: string; id?: string }) {
  return (
    <p id={id} role={error ? 'alert' : undefined} className={cn('mt-3 min-h-5 px-2 text-center text-[13px] leading-snug', error ? 'text-red-300' : 'text-paper/40')}>
      {error || hint}
    </p>
  )
}
