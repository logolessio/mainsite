'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { GradientField } from '@/components/shell/gradient-field'
import { LightField } from '@/components/shell/light-field'
import { Logo } from '@/components/logo'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { signInWithProvider } from '@/lib/auth'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** One digit that rolls up out of a blur and into the next, so the seconds tick without anything jumping. */
function Digit({ v, live }: { v: string; live: boolean }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.64em] overflow-hidden text-center align-top leading-none">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={v} initial={live ? { y: '55%', opacity: 0, filter: 'blur(8px)' } : false} animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }} exit={{ y: '-55%', opacity: 0, filter: 'blur(8px)' }} transition={{ duration: 0.5, ease: EASE }} className="absolute inset-0 grid place-items-center">
          {v}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Unit({ value, label, live }: { value: number; label: string; live: boolean }) {
  const t = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="font-display text-[clamp(3rem,10.5vw,9.5rem)] leading-none text-paper" aria-hidden="true">
        {[...t].map((c, i) => (
          <Digit key={i} v={c} live={live} />
        ))}
      </div>
      <span className="text-[clamp(.78rem,1.1vw,.95rem)] text-paper/45">{label}</span>
    </div>
  )
}

type Step = 'email' | 'handle' | 'done' | 'owner'

/** The page in front of the whole site while the owners have the launch switched on: the countdown, and a pill to join the list and reserve a username. */
export function LaunchPage({ end, headline, text, signedInAs }: { end: number | null; headline: string; text: string; signedInAs: string | null }) {
  const [now, setNow] = useState(() => Date.now())
  const [live, setLive] = useState(false)
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [handle, setHandle] = useState('')
  const [reserved, setReserved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [avail, setAvail] = useState<{ ok: boolean; problem?: string } | 'checking' | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLive(true)
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  useEffect(() => input.current?.focus(), [step])

  // is the username free? (asked while typing)
  useEffect(() => {
    if (step !== 'handle') return
    const h = handle.trim().toLowerCase().replace(/^@/, '')
    if (!h) return setAvail(null)
    setAvail('checking')
    const t = setTimeout(() => fetch(`/api/launch/signup?h=${encodeURIComponent(h)}`).then((r) => r.json()).then(setAvail).catch(() => setAvail(null)), 300)
    return () => clearTimeout(t)
  }, [handle, step])

  const left = end ? end * 1000 - now : null
  const p = left !== null ? parts(left) : null
  const over = left !== null && left <= 0

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/launch/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; owner?: boolean; handle?: string | null; error?: string }
    if (!res.ok) throw new Error(j.error ?? 'Something went wrong. Try again.')
    return j
  }

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const j = await post({ email: email.trim() })
      if (j.owner) {
        // an owner's address: straight to Google, through the same human check and sign-in start as the login page.
        // Only an owner's account gets past this page.
        setStep('owner')
        try {
          await signInWithProvider('google', undefined, '/', email.trim())
        } catch (err) {
          setStep('email')
          throw err
        }
        return
      }
      setStep('handle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const submitHandle = async (e: React.FormEvent) => {
    e.preventDefault()
    const h = handle.trim().toLowerCase().replace(/^@/, '')
    if (!h || busy) return
    setBusy(true)
    setError('')
    try {
      const j = await post({ email: email.trim(), handle: h })
      setReserved(j.handle ?? h)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'h-12 min-w-0 flex-1 bg-transparent text-[17px] text-paper outline-none placeholder:text-paper/40'
  const cta = 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-[background-color,transform] duration-300 hover:bg-paper/90 active:scale-[0.97] disabled:opacity-50'

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink text-paper">
      <GradientField />
      <LightField />
      <a href="/" aria-label="logoless" className="absolute top-6 left-6 z-20 md:top-8 md:left-9">
        <Logo play className="h-7 md:h-8" />
      </a>

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-[1200px] flex-col items-center justify-center px-6 py-28 text-center">
        <h1 className="rise-in font-display text-[clamp(2.6rem,6.4vw,6rem)] leading-[1.02] text-balance">{headline}</h1>

        {p && !over && (
          <div role="timer" aria-label={`${p.d} days, ${p.h} hours, ${p.m} minutes and ${p.s} seconds left`} style={{ ['--d' as string]: '0.12s' }} className="rise-in mt-12 flex items-start justify-center gap-[clamp(.8rem,3.2vw,3.2rem)]">
            <Unit value={p.d} label="Days" live={live} />
            <span aria-hidden="true" className="mt-[0.1em] font-display text-[clamp(2.2rem,7vw,6.4rem)] leading-none text-paper/25">:</span>
            <Unit value={p.h} label="Hours" live={live} />
            <span aria-hidden="true" className="mt-[0.1em] font-display text-[clamp(2.2rem,7vw,6.4rem)] leading-none text-paper/25">:</span>
            <Unit value={p.m} label="Minutes" live={live} />
            <span aria-hidden="true" className="mt-[0.1em] font-display text-[clamp(2.2rem,7vw,6.4rem)] leading-none text-paper/25">:</span>
            <Unit value={p.s} label="Seconds" live={live} />
          </div>
        )}
        {over && <p className="mt-10 font-display text-[clamp(1.8rem,4vw,3.2rem)] text-paper/80">The doors are opening.</p>}

        <p style={{ ['--d' as string]: '0.24s' }} className="rise-in mt-10 max-w-md text-[17px] leading-relaxed text-paper/55 text-pretty">
          {text}
        </p>

        <div style={{ ['--d' as string]: '0.34s' }} className="rise-in mt-9 w-full max-w-[580px]">
          <AnimatePresence mode="wait" initial={false}>
            {step === 'done' ? (
              <motion.div key="done" initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                <LiquidGlass rootClassName="mx-auto w-full" className="flex items-center justify-center gap-3 px-8 py-5 text-[17px]">
                  <span className="grid size-7 place-items-center rounded-full bg-paper text-ink">
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{reserved ? <>You are on the list. <span className="text-paper">@{reserved}</span> is yours.</> : 'You are on the list.'}</span>
                </LiquidGlass>
                <p className="mt-4 text-[14px] text-paper/45">We will email {email.trim()} when we open.</p>
              </motion.div>
            ) : (
              <motion.form key={step} onSubmit={step === 'handle' ? submitHandle : submitEmail} initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }} transition={{ duration: 0.45, ease: EASE }}>
                <LiquidGlass rootClassName="mx-auto w-full" className="flex items-center gap-2 py-2 pr-2 pl-6 md:pl-7">
                  {step === 'handle' && <span className="text-[17px] text-paper/50">@</span>}
                  {step === 'handle' ? (
                    <input ref={input} data-bare value={handle} onChange={(e) => { setHandle(e.target.value.replace(/\s/g, '').replace(/^@/, '').slice(0, 20)); setError('') }} placeholder="yourname" aria-label="The username to reserve" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={field} />
                  ) : (
                    <input ref={input} data-bare type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="Your email" aria-label="Your email" autoComplete="email" disabled={step === 'owner'} className={field} />
                  )}
                  {step === 'handle' && avail && (
                    <span className={cn('shrink-0 pr-1 text-[13px]', avail === 'checking' ? 'text-paper/40' : avail.ok ? 'text-emerald-300' : 'text-red-300')}>{avail === 'checking' ? 'checking' : avail.ok ? 'free' : 'taken'}</span>
                  )}
                  <button type="submit" disabled={busy || step === 'owner' || (step === 'email' ? !email.trim() : !handle.trim() || (avail !== null && avail !== 'checking' && !avail.ok))} className={cta}>
                    {busy || step === 'owner' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    {step === 'handle' ? 'Reserve it' : step === 'owner' ? 'Opening Google' : 'Notify me'}
                  </button>
                </LiquidGlass>
                <p role="alert" className="mt-3 min-h-5 text-[13.5px] text-red-300">
                  {error || (step === 'handle' && avail && avail !== 'checking' && !avail.ok ? avail.problem : '')}
                </p>
                {step === 'handle' ? (
                  <div className="mt-1 text-[15px] text-paper/55">
                    <p>Pick the name you want on logoless. It is held for you.</p>
                    <button type="button" onClick={() => setStep('done')} className="mt-3 text-paper/55 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper">
                      Not now
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-[15px] text-paper/45">Next, you can reserve your username.</p>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {signedInAs && (
          <p className="mt-10 max-w-sm text-[13.5px] leading-relaxed text-paper/40">
            You are signed in as {signedInAs}, which is not an owner account, so you cannot get in yet.{' '}
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="text-paper/70 underline underline-offset-4 hover:text-paper">
              Sign out
            </button>
          </p>
        )}
      </main>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex justify-center gap-6 pb-7 text-[13px] text-paper/35">
        <a href="/legal/terms" className="transition-colors hover:text-paper/70">Terms</a>
        <a href="/legal/privacy" className="transition-colors hover:text-paper/70">Privacy</a>
      </footer>
    </div>
  )
}
