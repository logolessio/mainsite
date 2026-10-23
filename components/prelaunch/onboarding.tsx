'use client'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ArrowLeft, Check, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { IntroLogo } from '@/components/logo-intro'
import { AutoHeight } from '@/components/launch/home/waitlist'
import { OtpInput } from '@/components/auth/email-ui'
import { GradientField } from '@/components/shell/gradient-field'
import { ensureHuman } from '@/lib/human-client'
import { cn } from '@/lib/utils'
import { RingButton, RingCard } from './ring'

const EASE = [0.22, 1, 0.36, 1] as const

type Step = 'accounts' | 'profile' | 'paypal' | 'done'
type Me = {
  signedIn: true
  step: Step
  discord: { linked: boolean; name: string | null }
  google: string | null
  image: string | null
  profile: { saved: boolean; name: string; handle: string; tiktok: string; youtube: string; instagram: string }
  paypal: string[]
  ceremony: boolean
  done: boolean
  held: boolean
  denied: boolean
  n: number | null
  discordUrl: string | null
}
type State = { signedIn: false } | Me

const STEPS: { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'profile', label: 'Profile' },
  { id: 'paypal', label: 'PayPal' },
]

const move = {
  initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(8px)' },
  transition: { duration: 0.45, ease: EASE },
}

async function call<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers }, cache: 'no-store' })
  return { ok: res.ok, status: res.status, data: ((await res.json().catch(() => ({}))) as T & { error?: string }) }
}

const field =
  'flex h-[54px] items-center gap-2 rounded-[calc(18px*var(--round,1))] border border-white/10 bg-white/[0.035] px-4 transition-[border-color,background-color] duration-200 focus-within:border-white/30 focus-within:bg-white/[0.06]'
const input = 'min-w-0 flex-1 bg-transparent text-[16px] text-paper outline-none placeholder:text-paper/30'
const title = 'font-display text-[clamp(2rem,7.5vw,2.7rem)] leading-[1.04] tracking-[-0.01em] text-paper'
const sub = 'mt-3 text-[15px] leading-relaxed text-paper/55'

const GRAD = 'linear-gradient(90deg, rgb(var(--c-red)), rgb(var(--c-amber)), rgb(var(--c-teal)), rgb(var(--c-blue)))'

/** Three bars, one per step: done ones are solid, the one you are on is the rainbow. */
function Progress({ at }: { at: Step }) {
  const i = STEPS.findIndex((s) => s.id === at)
  return (
    <ol className="flex w-full max-w-[300px] gap-2" aria-label="Progress">
      {STEPS.map((s, k) => (
        <li key={s.id} className="flex-1" aria-current={k === i ? 'step' : undefined}>
          <span className="block h-[3px] overflow-hidden rounded-full bg-white/10">
            <motion.span
              className="block h-full rounded-full"
              style={{ background: k < i ? 'rgb(255 255 255 / 0.85)' : GRAD }}
              initial={false}
              animate={{ width: k <= i ? '100%' : '0%' }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </span>
          <span className={cn('mt-2 block text-center text-[12px] transition-colors duration-300', k === i ? 'text-paper/80' : 'text-paper/30')}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 min-h-5 text-center text-[13px] leading-snug text-red-300">
      {children}
    </p>
  )
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mx-auto mt-5 flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-paper/45 transition-colors hover:text-paper/80">
      <ArrowLeft aria-hidden="true" className="size-3.5" /> Back
    </button>
  )
}

// ---- landing (signed out) ----
function Landing({ end, onDiscord, busy, error }: { end: number | null; onDiscord: () => void; busy: boolean; error: string }) {
  const opens = end ? new Date(end * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  return (
    <motion.div key="landing" {...move}>
      <RingCard on>
        <h1 className={title}>Become a founding member.</h1>
        <p className={sub}>
          {opens ? `logoless opens on ${opens}. ` : 'logoless opens soon. '}
          Set up your account now and you are in the community first, with the Founding member role.
        </p>
        <ul className="mt-6 space-y-2.5 text-[14px] text-paper/70">
          {['Takes about a minute', 'Sign in with Discord, add a profile, done', 'You land straight back in the server'].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <Check aria-hidden="true" className="size-4 shrink-0 text-paper/45" /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <RingButton onClick={onDiscord} busy={busy}>
            {busy ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <BrandIcon name="discord" className="size-5" />}
            Continue with Discord
          </RingButton>
        </div>
        <Err>{error}</Err>
        <p className="mt-1 text-center text-[12px] leading-relaxed text-paper/35">We look at every sign-up to keep bots out. Your Discord email stays private.</p>
      </RingCard>
    </motion.div>
  )
}

// ---- step 1: accounts ----
function Accounts({ me, notice, onNext, onGoogle, onUnlink }: { me: Me; notice: string; onNext: () => void; onGoogle: () => Promise<void>; onUnlink: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(notice)
  const run = async (fn: () => Promise<void>) => {
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
  return (
    <motion.div key="accounts" {...move}>
      <RingCard>
        <h1 className={title}>Your accounts</h1>
        <p className={sub}>Discord is how you get in. Google is optional, if you also want to sign in with it.</p>
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 rounded-[calc(18px*var(--round,1))] border border-white/10 bg-white/[0.035] p-3.5">
            {me.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.image} alt="" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full bg-white/10 object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
                <BrandIcon name="discord" className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-paper">Discord</span>
              <span className="block truncate text-[13px] text-paper/45">{me.discord.name ?? 'Connected'}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-teal-300">
              <Check aria-hidden="true" className="size-4" /> Connected
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-[calc(18px*var(--round,1))] border border-white/10 bg-white/[0.035] p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
              <BrandIcon name="google" className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-paper">Google</span>
              <span className="block truncate text-[13px] text-paper/45">{me.google ? me.google : 'Optional'}</span>
            </span>
            {me.google ? (
              <button type="button" disabled={busy} onClick={() => void run(onUnlink)} className="rounded-full px-3 py-2 text-[13px] text-paper/50 transition-colors hover:text-paper disabled:opacity-50">
                Remove
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(onGoogle)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-[14px] text-paper transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Add
              </button>
            )}
          </div>
        </div>
        <Err>{error}</Err>
        <div className="mt-2">
          <RingButton onClick={onNext}>Continue</RingButton>
        </div>
      </RingCard>
    </motion.div>
  )
}

// ---- step 2: profile ----
const typedHandle = (v: string) => v.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '').slice(0, 20)

type Avail = null | 'checking' | { ok: boolean; message?: string; suggestions?: string[] }

function Profile({ me, onSaved, onBack }: { me: Me; onSaved: () => void; onBack: () => void }) {
  const [name, setName] = useState(me.profile.name)
  const [handle, setHandle] = useState(me.profile.handle)
  const [tiktok, setTiktok] = useState(me.profile.tiktok)
  const [youtube, setYoutube] = useState(me.profile.youtube)
  const [instagram, setInstagram] = useState(me.profile.instagram)
  const [trap, setTrap] = useState('')
  const [avail, setAvail] = useState<Avail>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true })
    nameRef.current?.select()
  }, [])

  // is the username free? asked a moment after the last key
  useEffect(() => {
    const h = typedHandle(handle)
    if (h.length < 3) return setAvail(h ? { ok: false, message: 'At least 3 characters.' } : null)
    setAvail('checking')
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      fetch(`/api/me/handle?h=${encodeURIComponent(h)}`, { signal: ctl.signal, cache: 'no-store' })
        .then((r) => r.json())
        .then((j: { available?: boolean; message?: string; suggestions?: string[] }) => setAvail({ ok: j.available === true, message: j.message, suggestions: j.suggestions }))
        .catch(() => undefined)
    }, 300)
    return () => {
      ctl.abort()
      window.clearTimeout(t)
    }
  }, [handle])

  const ready = name.trim().length > 0 && avail !== null && avail !== 'checking' && avail.ok
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError('')
    const r = await call('/api/pre/profile', { method: 'POST', body: JSON.stringify({ name: name.trim(), handle: typedHandle(handle), tiktok, youtube, instagram, website: trap }) })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'We could not save that. Please try again.')
    onSaved()
  }

  const social = (id: 'tiktok' | 'youtube' | 'instagram', label: string, value: string, set: (v: string) => void) => (
    <label className={field}>
      <BrandIcon name={id} className="size-[18px] text-paper/45" />
      <span className="sr-only">{label}</span>
      <input data-bare value={value} onChange={(e) => set(e.target.value.slice(0, 120))} placeholder={`${label} username`} autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" className={input} />
    </label>
  )

  return (
    <motion.form key="profile" {...move} onSubmit={submit} noValidate>
      <RingCard>
        <h1 className={title}>Your profile</h1>
        <p className={sub}>This is how you show up when campaigns start. You can change it any time.</p>
        <div className="mt-6 space-y-3">
          <label className={field}>
            <span className="sr-only">Your name</span>
            <input ref={nameRef} data-bare value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Your name" autoComplete="name" className={input} />
          </label>
          <div>
            <label className={field}>
              <span className="text-paper/35" aria-hidden="true">
                @
              </span>
              <span className="sr-only">Username</span>
              <input
                data-bare
                value={handle}
                onChange={(e) => setHandle(typedHandle(e.target.value))}
                placeholder="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className={input}
              />
              <span className="grid size-5 shrink-0 place-items-center" aria-live="polite">
                {avail === 'checking' ? (
                  <Loader2 aria-label="Checking" className="size-4 animate-spin text-paper/40" />
                ) : avail ? (
                  avail.ok ? (
                    <Check aria-label="Available" className="size-4 text-teal-300" />
                  ) : (
                    <X aria-label="Not available" className="size-4 text-red-300" />
                  )
                ) : null}
              </span>
            </label>
            <AnimatePresence initial={false}>
              {avail && avail !== 'checking' && !avail.ok && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <p className="px-1 pt-2 text-[13px] text-red-300">{avail.message ?? 'That username is not available.'}</p>
                  {avail.suggestions && avail.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-1 pt-2">
                      {avail.suggestions.slice(0, 3).map((s) => (
                        <button key={s} type="button" onClick={() => setHandle(typedHandle(s))} className="rounded-full border border-white/15 px-3 py-1.5 text-[13px] text-paper/80 transition-colors hover:bg-white/10">
                          @{s}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="mt-7 mb-3 text-[13px] text-paper/40">Where you post (optional)</p>
        <div className="space-y-3">
          {social('tiktok', 'TikTok', tiktok, setTiktok)}
          {social('youtube', 'YouTube', youtube, setYoutube)}
          {social('instagram', 'Instagram', instagram, setInstagram)}
        </div>
        {/* only a script fills this in: it is hidden from people and from screen readers */}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <Err>{error}</Err>
        <div className="mt-2">
          <RingButton type="submit" busy={busy} disabled={!ready}>
            Continue
          </RingButton>
        </div>
      </RingCard>
      <Back onClick={onBack} />
    </motion.form>
  )
}

// ---- step 3: PayPal ----
const validEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

function PayPal({ me, onFinish, onBack }: { me: Me; onFinish: () => Promise<string | null>; onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [added, setAdded] = useState<string[]>(me.paypal)
  const [sentTo, setSentTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cool, setCool] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!added.length) emailRef.current?.focus({ preventScroll: true })
  }, [added.length])
  useEffect(() => {
    if (cool <= 0) return
    const id = window.setTimeout(() => setCool((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cool])

  const addr = email.trim().toLowerCase()
  const run = async (fn: () => Promise<void>) => {
    if (busy) return
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
  const mask = (e: string) => e.replace(/^(.{1,2}).*(@.*)$/, '$1***$2')

  const send = () =>
    run(async () => {
      if (me.ceremony) {
        const r = await call<{ sentTo?: string }>('/api/me/paypal', { method: 'POST', body: JSON.stringify({ action: 'send', email: addr }) })
        if (!r.ok) throw new Error(r.data.error ?? 'We could not send the code.')
        setSentTo(r.data.sentTo ?? '')
        setCode('')
        setCool(30)
        setStage('code')
        return
      }
      const r = await call('/api/me/paypal', { method: 'POST', body: JSON.stringify({ email: addr }) })
      if (!r.ok) throw new Error(r.data.error ?? 'We could not add that email.')
      setAdded([mask(addr)])
    })

  const confirm = (value: string) =>
    run(async () => {
      const r = await call('/api/me/paypal', { method: 'POST', body: JSON.stringify({ email: addr, code: value }) })
      if (!r.ok) {
        setCode('')
        throw new Error(r.data.error ?? 'That code is not right.')
      }
      setAdded([mask(addr)])
      setStage('email')
      setEmail('')
    })

  const finish = () =>
    run(async () => {
      const problem = await onFinish()
      if (problem) throw new Error(problem)
    })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (stage === 'code') return void (code.length === 6 && confirm(code))
    if (addr && !added.length) return void (validEmail(addr) ? send() : setError('Enter a valid PayPal email, or leave it empty to skip.'))
    void finish()
  }

  const label = stage === 'code' ? 'Confirm' : added.length ? 'Finish' : addr ? (me.ceremony ? 'Send code' : 'Add and finish') : 'Finish'

  return (
    <motion.form key="paypal" {...move} onSubmit={onSubmit} noValidate>
      <RingCard>
        <h1 className={title}>
          Where should we pay you?
        </h1>
        <p className={sub}>Optional. Add the PayPal email payouts will go to, so you are ready from your first campaign. We cover PayPal’s fees.</p>
        <div className="mt-6">
          <AutoHeight>
            <AnimatePresence mode="wait" initial={false}>
              {added.length > 0 && stage === 'email' ? (
                <motion.div key="added" {...move} className="flex items-center gap-3 rounded-[calc(18px*var(--round,1))] border border-white/10 bg-white/[0.035] p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-400/15">
                    <Check aria-hidden="true" className="size-5 text-teal-300" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-paper">PayPal added</span>
                    <span className="block truncate text-[13px] text-paper/45">{added[0]}</span>
                  </span>
                </motion.div>
              ) : stage === 'code' ? (
                <motion.div key="code" {...move}>
                  <p className="mb-4 text-center text-[14px] text-paper/60">
                    We sent a 6 digit code to <span className="text-paper">{sentTo || 'your account email'}</span>.
                  </p>
                  <OtpInput
                    value={code}
                    disabled={busy}
                    onChange={(v) => {
                      setCode(v)
                      if (v.length === 6) void confirm(v)
                    }}
                  />
                  <div className="mt-4 flex justify-center gap-5 text-[13px] text-paper/45">
                    <button type="button" disabled={cool > 0 || busy} onClick={() => void send()} className="transition-colors hover:text-paper disabled:opacity-50">
                      {cool > 0 ? `Send again in ${cool}s` : 'Send again'}
                    </button>
                    <button type="button" onClick={() => setStage('email')} className="transition-colors hover:text-paper">
                      Change email
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.label key="email" {...move} className={field}>
                  <span className="sr-only">PayPal email</span>
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
                    placeholder="PayPal email"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={input}
                  />
                </motion.label>
              )}
            </AnimatePresence>
          </AutoHeight>
        </div>
        <Err>{error}</Err>
        {stage !== 'code' && (
          <div className="mt-2">
            <RingButton type="submit" busy={busy}>
              {label}
            </RingButton>
          </div>
        )}
      </RingCard>
      <Back onClick={onBack} />
    </motion.form>
  )
}

// ---- the end ----
function Done({ me, invite }: { me: Me; /** set when they could not be added to the server: the link that gets them in */ invite: string | null }) {
  return (
    <motion.div key="done" {...move}>
      <RingCard on>
        {me.n ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-paper/80">
              <Check aria-hidden="true" className="size-3.5" /> Founding member #{me.n}
            </span>
            <h1 className={cn(title, 'mt-5')}>You are in.</h1>
            <p className={sub}>Your Founding member role is on, so the community channels are open. Say hello, and we will message you the moment the first campaigns go live.</p>
          </>
        ) : me.denied ? (
          <>
            <h1 className={title}>We could not confirm this one.</h1>
            <p className={sub}>If that is a mistake, open a ticket in the Discord server and the team will take another look.</p>
          </>
        ) : (
          <>
            <h1 className={title}>Almost there.</h1>
            <p className={sub}>We check a few sign-ups by hand to keep bots out. Yours is in the queue, and you will get the Founding member role (and a message from us on Discord) as soon as it is cleared.</p>
          </>
        )}
        {(invite || me.discordUrl) && (
          <div className="mt-8">
            <RingButton href={invite ?? me.discordUrl ?? undefined} external={Boolean(invite)}>
              <BrandIcon name="discord" className="size-5" />
              {invite ? 'Join the server' : 'Open Discord'}
            </RingButton>
          </div>
        )}
        {invite ? <p className="mt-5 text-center text-[13px] leading-relaxed text-paper/40">You are not in the server yet. Join with this button and your Founding member role is added within a few minutes.</p> : null}
        {me.n && !invite ? <p className="mt-5 text-center text-[13px] leading-relaxed text-paper/40">Next: link your TikTok, YouTube or Instagram with /verify in the server. Verified creators are picked first.</p> : null}
      </RingCard>
    </motion.div>
  )
}

/**
 * beta.logoless.io/onboarding: the sign-up that is open while the rest of the site is shut. One panel at a time, each with the search bar's rainbow ring; the
 * server says how far a person has got, so a refresh (or coming back later) opens the first step they have not finished.
 */
export function PreLaunchOnboarding({ end, joinBase, notice }: { end: number | null; joinBase: string; notice: 'taken' | 'owner' | 'used' | null }) {
  const [state, setState] = useState<State | null>(null)
  const [at, setAt] = useState<Step | 'landing'>('landing')
  const [busy, setBusy] = useState(false)
  const [invite, setInvite] = useState<string | null>(null)
  const [error, setError] = useState('')
  const noticeText =
    notice === 'taken' ? 'That Google account already has its own logoless account, so it cannot be added here.' : notice === 'owner' ? 'That Google address cannot be added.' : notice === 'used' ? 'That link was already used. Press Add again.' : ''

  const load = useCallback(async () => {
    const r = await call<State>('/api/pre/state')
    const s: State = r.ok ? r.data : { signedIn: false }
    setState(s)
    return s
  }, [])

  useEffect(() => {
    void load().then((s) => setAt(s.signedIn ? s.step : 'landing'))
  }, [load])

  const joinUrl = (extra = '') => `${joinBase}?${extra}then=${encodeURIComponent(`${window.location.origin}/onboarding`)}`
  const discord = () => {
    setBusy(true)
    window.location.href = joinUrl()
  }
  const google = async () => {
    const r = await call('/api/pre/link', { method: 'POST' })
    if (!r.ok) throw new Error(r.data.error ?? 'We could not start that. Please try again.')
    window.location.href = joinUrl('with=google&')
  }
  const unlink = async () => {
    const r = await call('/api/pre/link', { method: 'DELETE' })
    if (!r.ok) throw new Error(r.data.error ?? 'We could not remove that.')
    await load()
  }

  /** The last press. Returns what to tell the person if it did not work. */
  const finish = async (): Promise<string | null> => {
    let r = await call<{ needHuman?: boolean; invite?: string | null }>('/api/pre/finish', { method: 'POST' })
    if (r.status === 403 && r.data.needHuman) {
      try {
        await ensureHuman()
      } catch (e) {
        return e instanceof Error ? e.message : 'The quick check did not pass. Please try again.'
      }
      r = await call('/api/pre/finish', { method: 'POST' })
    }
    if (!r.ok) return r.data.error ?? 'We could not finish. Please try again.'
    setInvite(r.data.invite ?? null)
    const s = await load()
    setAt(s.signedIn ? s.step : 'landing')
    return null
  }

  const me = state?.signedIn ? state : null
  const progressAt = at === 'landing' || at === 'done' ? null : at

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative isolate min-h-dvh overflow-x-clip px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <GradientField />
        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-[440px] flex-col justify-center">
          <header className="mb-8 flex flex-col items-center gap-7">
            <IntroLogo replay className="h-[clamp(34px,8vw,48px)]" />
            <div className="h-[30px]">{progressAt && <Progress at={progressAt} />}</div>
          </header>
          {state === null ? (
            <div className="grid h-40 place-items-center" role="status" aria-label="Loading">
              <Loader2 aria-hidden="true" className="size-6 animate-spin text-paper/40" />
            </div>
          ) : (
            <AutoHeight margin={72}>
              <AnimatePresence mode="wait" initial={false}>
                {at === 'landing' || !me ? (
                  <Landing end={end} onDiscord={discord} busy={busy} error={error || ''} />
                ) : at === 'accounts' ? (
                  <Accounts me={me} notice={noticeText} onNext={() => setAt('profile')} onGoogle={google} onUnlink={unlink} />
                ) : at === 'profile' ? (
                  <Profile
                    me={me}
                    onBack={() => setAt('accounts')}
                    onSaved={() => {
                      void load().then(() => setAt('paypal'))
                    }}
                  />
                ) : at === 'paypal' ? (
                  <PayPal me={me} onBack={() => setAt('profile')} onFinish={finish} />
                ) : (
                  <Done me={me} invite={invite} />
                )}
              </AnimatePresence>
            </AutoHeight>
          )}
          <footer className="mt-8 text-center text-[12px] leading-relaxed text-paper/30">
            By continuing you agree to the{' '}
            <a href="https://logoless.io/legal/terms" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-paper/60">
              Terms
            </a>{' '}
            and{' '}
            <a href="https://logoless.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-paper/60">
              Privacy Policy
            </a>
            .
          </footer>
        </div>
      </main>
    </MotionConfig>
  )
}
