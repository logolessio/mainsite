'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Eye, EyeOff, Mail, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BlobTabs } from '@/components/glass/blob'
import { GlassSurface } from '@/components/glass/glass'
import { BrandIcon } from '@/components/brand-icon'
import { confirmSignup, resendSignupCode, signInWithEmail, signInWithProvider, signUpWithEmail } from '@/lib/auth'
import { type Mini, type Profile, poster } from '@/lib/trailers/types'
import { cn } from '@/lib/utils'
import { api } from './ctx'
import { EASE, GButton, Mark, Typed } from './ui'

type Step = 'welcome' | 'favorites' | 'name' | 'account' | 'saving'
const DRAFT = 'trailers.draft'
const MIN = 3
const MAX = 8

type Draft = { favorites: Mini[]; name: string }
const readDraft = (): Draft => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) ?? '{}') as Partial<Draft>
    return { favorites: Array.isArray(d.favorites) ? d.favorites : [], name: typeof d.name === 'string' ? d.name : '' }
  } catch {
    return { favorites: [], name: '' }
  }
}

const field = 'relative z-10 h-full w-full bg-transparent px-6 text-[17px] text-paper outline-none placeholder:text-paper/40'

function Field({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <GlassSurface shine flat className={cn('h-14 w-full', className)}>
      {children}
    </GlassSurface>
  )
}

function PosterTile({ m, on, onPick, full }: { m: Mini; on: boolean; onPick: (m: Mini) => void; full: boolean }) {
  return (
    <motion.button
      type="button"
      layout
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 480, damping: 30 }}
      onClick={() => onPick(m)}
      disabled={full && !on}
      aria-pressed={on}
      aria-label={`${m.t}${m.y ? ` (${m.y})` : ''}`}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-[18px] bg-white/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-paper/70 disabled:opacity-35"
    >
      {m.p && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster(m.p, 342)} alt="" loading="lazy" draggable={false} className="size-full object-cover transition-[filter,transform] duration-500 group-hover:scale-[1.04]" style={{ filter: on ? 'brightness(0.55)' : undefined }} />
      )}
      <span aria-hidden="true" className="absolute inset-0 rounded-[18px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]" />
      <AnimatePresence>
        {on && (
          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 22 }} className="absolute top-1/2 left-1/2 -mt-6 -ml-6 grid size-12 place-items-center">
            <GlassSurface lens className="absolute inset-0" tint="linear-gradient(180deg, rgb(255 255 255 / 0.62), rgb(255 255 255 / 0.34))" />
            <Check className="relative z-10 size-6 text-ink" strokeWidth={3} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function Onboarding({ signedIn, name: signedName, onDone, redo = false, current }: { signedIn: boolean; name: string | null; onDone: (p: Profile) => void; redo?: boolean; current?: Profile | null }) {
  const [step, setStep] = useState<Step>(signedIn ? 'favorites' : 'welcome')
  const [picks, setPicks] = useState<Mini[]>([])
  const [name, setName] = useState('')
  const [trending, setTrending] = useState<Mini[]>([])
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Mini[] | null>(null)
  const [mode, setMode] = useState<'create' | 'login'>('create')
  const [via, setVia] = useState<'choose' | 'email' | 'code'>('choose')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState(false)
  const loaded = useRef(false)

  // what was chosen survives going away to Google or Discord and coming back
  useEffect(() => {
    if (redo && current) {
      setPicks(current.favorites)
      setName(current.name)
    } else {
      const d = readDraft()
      setPicks(d.favorites)
      setName(d.name || signedName || '')
    }
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedName])
  useEffect(() => {
    if (!loaded.current) return
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ favorites: picks, name } satisfies Draft))
    } catch {
      /* private window */
    }
  }, [picks, name])

  useEffect(() => {
    api<{ results: Mini[] }>('/api/trailers/trending').then((r) => setTrending(r.results)).catch(() => {})
  }, [])

  useEffect(() => {
    setTyped(false)
  }, [step])

  // search as you type
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return setResults(null)
    const t = setTimeout(() => api<{ results: Mini[] }>(`/api/trailers/search?q=${encodeURIComponent(term)}`).then((r) => setResults(r.results)).catch(() => setResults([])), 260)
    return () => clearTimeout(t)
  }, [q])

  const toggle = useCallback((m: Mini) => setPicks((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : p.length >= MAX ? p : [...p, m])), [])
  const shown = results ?? trending
  const full = picks.length >= MAX

  /** Makes the profile from what was chosen, then hands over. */
  const finish = useCallback(async () => {
    setStep('saving')
    try {
      const me = await api<{ profile: Profile | null }>('/api/trailers/me')
      if (me.profile && redo) {
        // picking favourites again: keep the account, change the picks
        const favs = picks.length ? picks : me.profile.favorites
        let p = (await api<{ profile: Profile }>('/api/trailers/me', { body: { op: 'favorites', favorites: favs.slice(0, MAX) } })).profile
        if (name.trim() && name.trim() !== p.name) p = (await api<{ profile: Profile }>('/api/trailers/me', { body: { op: 'name', name: name.trim() } })).profile
        return onDone(p)
      }
      if (me.profile) return onDone(me.profile)
      const d = readDraft()
      const favs = d.favorites.length ? d.favorites : picks
      const nm = (d.name || name || signedName || '').trim()
      if (favs.length < 1 || !nm) {
        setStep(favs.length < 1 ? 'favorites' : 'name')
        return
      }
      const r = await api<{ profile: Profile }>('/api/trailers/me', { body: { op: 'onboard', name: nm, favorites: favs.slice(0, MAX) } })
      try {
        localStorage.removeItem(DRAFT)
      } catch {
        /* ignore */
      }
      await new Promise((res) => setTimeout(res, 900))
      onDone(r.profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setStep('account')
    }
  }, [onDone, picks, name, signedName])

  // signed in already (came back from Google or Discord, or had an account): go straight on once there is enough to build a profile
  useEffect(() => {
    if (!signedIn || redo) return
    const d = readDraft()
    if (d.favorites.length >= MIN && (d.name || signedName)) void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  const emailOk = /\S+@\S+\.\S+/.test(email.trim())
  const passwordOk = mode === 'create' ? password.length >= 10 : password.length >= 1

  /** Log in with an email and password, or start making an account (a six-digit code is emailed to prove the address). */
  const submitEmail = async () => {
    setBusy(true)
    setError('')
    setNote('')
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password)
        await finish()
      } else {
        await signUpWithEmail({ email: email.trim(), password, name: name.trim() || undefined })
        setCode('')
        setVia('code')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async () => {
    setBusy(true)
    setError('')
    try {
      await confirmSignup(email.trim(), code.trim())
      await finish()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    try {
      await resendSignupCode(email.trim())
      setNote('A new code is on its way.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  /** Google and Discord are only set up for logoless.io, so on scroll the sign-in is started there and comes straight back (the cookie is shared). */
  const social = async (p: 'google' | 'discord') => {
    setBusy(true)
    setError('')
    try {
      if (location.hostname === 'scroll.logoless.io') {
        window.location.assign(`https://logoless.io/scroll-signin?p=${p}`)
        return
      }
      await signInWithProvider(p, undefined, '/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  const collage = useMemo(() => trending.slice(0, 18), [trending])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-paper">
      <Mark />
      {/* a slow drift of blurred posters behind everything */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute -inset-[10%] grid grid-cols-6 gap-6 opacity-[0.28] blur-[28px]" animate={{ y: [0, -80, 0], x: [0, 30, 0] }} transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}>
          {collage.map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.id} src={poster(m.p, 342)} alt="" className="aspect-[2/3] w-full rounded-3xl object-cover" style={{ marginTop: (i % 3) * 36 }} />
          ))}
        </motion.div>
        <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_45%,transparent,rgb(0_0_0/0.92))]" />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }} transition={{ duration: 0.55, ease: EASE }} className="absolute inset-0 flex flex-col items-center justify-center px-10">
          {step === 'welcome' && (
            <div className="flex max-w-3xl flex-col items-center text-center">
              <Typed text="Every trailer. One scroll." className="text-[clamp(3.4rem,7.2vw,6.8rem)] leading-[1.02]" onDone={() => setTyped(true)} />
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: typed ? 1 : 0, y: typed ? 0 : 10 }} transition={{ duration: 0.7, ease: EASE }} className="mt-7 max-w-lg text-[18px] leading-relaxed text-paper/60">
                Tell us a few movies you love and we will line up the trailers you will want to watch next.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: typed ? 1 : 0, y: typed ? 0 : 14 }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }} className="mt-12 flex flex-col items-center gap-5">
                <GButton variant="primary" size="lg" onClick={() => setStep('favorites')}>
                  Start
                </GButton>
                <button type="button" onClick={() => { setMode('login'); setStep('account') }} className="text-[15px] text-paper/55 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper">
                  I already have an account
                </button>
              </motion.div>
            </div>
          )}

          {step === 'favorites' && (
            <div className="flex h-full w-full max-w-[1180px] flex-col items-center pt-[11vh] pb-10">
              <Typed text="What are your favourite movies?" className="text-center text-[clamp(2.4rem,4.4vw,4.2rem)] leading-[1.05]" onDone={() => setTyped(true)} speed={22} />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: typed ? 1 : 0 }} transition={{ duration: 0.6 }} className="mt-7 flex w-full max-w-[560px] items-center gap-3">
                <Field className="flex-1">
                  <Search className="absolute top-1/2 left-5 z-10 size-[18px] -translate-y-1/2 text-paper/50" aria-hidden="true" />
                  <input data-bare value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a movie" aria-label="Search for a movie" className={cn(field, 'pl-13')} />
                  {q && (
                    <button type="button" onClick={() => setQ('')} aria-label="Clear" className="absolute top-1/2 right-4 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full text-paper/60 hover:text-paper">
                      <X className="size-4" />
                    </button>
                  )}
                </Field>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: typed ? 1 : 0, y: typed ? 0 : 16 }} transition={{ duration: 0.7, ease: EASE }} className="mt-8 min-h-0 w-full flex-1 overflow-y-auto px-2 pt-3 pb-6 [mask-image:linear-gradient(to_bottom,transparent,#000_16px,#000_calc(100%-40px),transparent)] [scrollbar-width:none]">
                {shown.length === 0 ? (
                  <p className="pt-16 text-center text-paper/50">{results ? 'Nothing found. Try another spelling.' : 'Loading the posters…'}</p>
                ) : (
                  <motion.div layout className="grid grid-cols-6 gap-x-5 gap-y-6 xl:grid-cols-7">
                    {shown.map((m) => (
                      <PosterTile key={m.id} m={m} on={picks.some((x) => x.id === m.id)} onPick={toggle} full={full} />
                    ))}
                  </motion.div>
                )}
              </motion.div>
              <div className="mt-2 flex w-full items-center justify-between gap-6">
                <div className="flex min-h-[64px] flex-1 items-center gap-2 overflow-hidden">
                  <AnimatePresence initial={false}>
                    {picks.map((m) => (
                      <motion.button key={m.id} layout initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.4 }} transition={{ type: 'spring', stiffness: 480, damping: 30 }} type="button" onClick={() => toggle(m)} aria-label={`Remove ${m.t}`} className="group relative h-16 w-[43px] shrink-0 overflow-hidden rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-paper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={poster(m.p, 185)} alt="" className="size-full object-cover" />
                        <span className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"><X className="size-4" /></span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  <span className="ml-2 text-[14px] text-paper/50">{picks.length < MIN ? `Pick ${MIN - picks.length} more` : full ? 'That is the most you can pick' : `${picks.length} picked`}</span>
                </div>
                <GButton variant="primary" size="lg" disabled={picks.length < MIN} onClick={() => setStep('name')}>
                  Continue
                </GButton>
              </div>
            </div>
          )}

          {step === 'name' && (
            <div className="flex w-full max-w-xl flex-col items-center text-center">
              <Typed text="What should we call you?" className="text-[clamp(2.8rem,5vw,4.8rem)] leading-[1.05]" onDone={() => setTyped(true)} />
              <motion.form initial={{ opacity: 0, y: 14 }} animate={{ opacity: typed ? 1 : 0, y: typed ? 0 : 14 }} transition={{ duration: 0.7, ease: EASE }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) (signedIn ? void finish() : setStep('account')) }} className="mt-10 flex w-full flex-col items-center gap-8">
                <Field className="h-16 max-w-md">
                  <input data-bare autoFocus value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Your name" aria-label="Your name" className={cn(field, 'text-center font-display text-[26px]')} />
                </Field>
                <div className="flex items-center gap-6">
                  <button type="button" onClick={() => setStep('favorites')} className="text-[15px] text-paper/55 underline decoration-paper/25 underline-offset-4 hover:text-paper">Back</button>
                  <GButton variant="primary" size="lg" disabled={!name.trim()} type="submit">Continue</GButton>
                </div>
              </motion.form>
            </div>
          )}

          {step === 'account' && (
            <div className="flex w-full max-w-[540px] flex-col items-center">
              <Typed text={via === 'code' ? 'Check your email.' : mode === 'create' ? 'Make it yours.' : 'Welcome back.'} className="text-[clamp(2.8rem,5vw,4.6rem)] leading-[1.05]" onDone={() => setTyped(true)} />
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: typed ? 1 : 0, y: typed ? 0 : 18 }} transition={{ duration: 0.7, ease: EASE }} className="mt-8 w-full">
                <GlassSurface radius={36} className="w-full" inner="p-8">
                  <div className="relative z-10 flex flex-col gap-4">
                    {via === 'choose' && (
                      <>
                        <p className="px-1 text-center text-[15px] text-paper/60">{mode === 'create' ? 'Choose how you want to sign in.' : 'Sign in the way you did before.'}</p>
                        <GButton size="lg" className="w-full" disabled={busy} busy={busy} onClick={() => social('google')} icon={<BrandIcon name="google" className="size-[18px]" />}>Continue with Google</GButton>
                        <GButton size="lg" className="w-full" disabled={busy} onClick={() => social('discord')} icon={<BrandIcon name="discord" className="size-[18px]" />}>Continue with Discord</GButton>
                        <GButton size="lg" className="w-full" disabled={busy} onClick={() => { setVia('email'); setError('') }} icon={<Mail className="size-[18px]" aria-hidden="true" />}>Continue with email</GButton>
                        <p role="alert" className="min-h-5 px-2 text-center text-[13.5px] text-red-300">{error}</p>
                        <button type="button" onClick={() => { setMode(mode === 'create' ? 'login' : 'create'); setError('') }} className="self-center text-[14.5px] text-paper/55 underline decoration-paper/25 underline-offset-4 hover:text-paper">
                          {mode === 'create' ? 'I already have an account' : 'New here? Make an account'}
                        </button>
                      </>
                    )}

                    {via === 'email' && (
                      <>
                        <div className="mb-2 flex justify-center">
                          <BlobTabs ariaLabel="Create an account or log in" value={mode} onChange={(v) => { setMode(v as 'create' | 'login'); setError('') }} items={[{ id: 'create', label: 'Create account', aria: 'Create an account' }, { id: 'login', label: 'Log in', aria: 'Log in' }]} height={40} />
                        </div>
                        <Field>
                          <input data-bare value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" aria-label="Email" className={field} autoFocus />
                        </Field>
                        <Field>
                          <input data-bare value={password} onChange={(e) => setPassword(e.target.value)} type={show ? 'text' : 'password'} placeholder={mode === 'create' ? 'Password (10 or more characters)' : 'Password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} aria-label="Password" className={cn(field, 'pr-14')} onKeyDown={(e) => e.key === 'Enter' && emailOk && passwordOk && !busy && submitEmail()} />
                          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-3 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full text-paper/60 hover:text-paper">
                            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                          </button>
                        </Field>
                        <p role="alert" className="min-h-5 px-2 text-center text-[13.5px] text-red-300">{error}</p>
                        <GButton variant="primary" size="lg" className="w-full" busy={busy} disabled={busy || !emailOk || !passwordOk} onClick={submitEmail}>
                          {mode === 'create' ? 'Send me a code' : 'Log in'}
                        </GButton>
                        <button type="button" onClick={() => { setVia('choose'); setError('') }} className="self-center text-[14.5px] text-paper/55 underline decoration-paper/25 underline-offset-4 hover:text-paper">Other ways to sign in</button>
                      </>
                    )}

                    {via === 'code' && (
                      <>
                        <p className="px-1 text-center text-[15px] leading-relaxed text-paper/60">We sent a six-digit code to <span className="text-paper">{email.trim()}</span>. It works for ten minutes.</p>
                        <Field>
                          <input data-bare value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" autoComplete="one-time-code" aria-label="Six-digit code" autoFocus className={cn(field, 'text-center font-mono text-[24px] tracking-[0.5em]')} onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && !busy && submitCode()} />
                        </Field>
                        <p role="alert" className="min-h-5 px-2 text-center text-[13.5px] text-red-300">{error || (note && <span className="text-paper/60">{note}</span>)}</p>
                        <GButton variant="primary" size="lg" className="w-full" busy={busy} disabled={busy || code.length !== 6} onClick={submitCode}>Create my account</GButton>
                        <div className="flex items-center justify-center gap-6">
                          <button type="button" onClick={() => void resend()} className="text-[14.5px] text-paper/55 underline decoration-paper/25 underline-offset-4 hover:text-paper">Send it again</button>
                          <button type="button" onClick={() => { setVia('email'); setError(''); setNote('') }} className="text-[14.5px] text-paper/55 underline decoration-paper/25 underline-offset-4 hover:text-paper">Change the email</button>
                        </div>
                      </>
                    )}
                  </div>
                </GlassSurface>
                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={() => setStep('name')} className="text-[15px] text-paper/55 underline decoration-paper/25 underline-offset-4 hover:text-paper">Back</button>
                </div>
              </motion.div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center text-center">
              <div className="relative grid size-40 place-items-center">
                <GlassSurface lens className="absolute inset-0" />
                <motion.svg viewBox="0 0 100 100" className="absolute inset-3" animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgb(243 242 238 / 0.9)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="70 210" />
                </motion.svg>
              </div>
              <h1 className="mt-10 font-display text-[clamp(2.2rem,3.6vw,3.4rem)]">Lining up your trailers.</h1>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
