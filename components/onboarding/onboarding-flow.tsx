'use client'

import { checkEmail, cleanEmail } from '@/lib/email-check'
import { AnimatePresence, motion } from 'framer-motion'
import { Logo } from '@/components/logo'
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Mail, X } from 'lucide-react'
import { signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrandIcon } from '@/components/brand-icon'
import { useDesign } from '@/components/shell/design-provider'
import { useMotionPrefs, useMounted } from '@/hooks/use-motion-prefs'
import { type Provider, type Role, signInWithProvider, signUpWithEmail } from '@/lib/auth'
import { ensureHuman } from '@/lib/human-client'
import { uploadImage } from '@/lib/image-client'
import { LookPicker } from '@/components/profile/look-picker'
import { Tour } from './tour'
import { AccountsStep, type AccountsStatus } from './accounts-step'
import { VerifyAccounts } from './verify-accounts'
import { avatarCss, bannerCss, lookById, lookFor, lookKey } from '@/lib/looks'
import { checkHandle, checkHandleAvailable, resendEmailCode, verifyEmailCode } from '@/lib/onboarding'
import { handleHint, handleProblem, suggestHandle } from '@/lib/profile-style'
import { cn } from '@/lib/utils'

type Id = 'welcome' | 'role' | 'method' | 'email' | 'password' | 'code' | 'paypal' | 'name' | 'handle' | 'pictures' | 'accounts' | 'happy' | 'saving' | 'verify' | 'hello' | 'tour' | 'done'

type Data = {
  role: Role | null
  email: string
  paypal: string
  name: string
  handle: string
  avatarKey: string | null
  avatarUrl: string | null
  bannerKey: string | null
  bannerUrl: string | null
  /** The ready-made look used for whatever was not uploaded (see lib/looks.ts). */
  lookId: string
  /** Platform handles, for the accounts the person posts from. */
  linked: Record<string, string>
}

type St = 'idle' | 'checking' | 'ok' | 'bad'
type Verdict = { ok: boolean; msg: string } | null

const HANDLE_RE = /^[a-z0-9_]{1,20}$/
const VERIFIABLE = ['tiktok', 'youtube', 'instagram']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SETTLE_MS = 5200 // "setting things up" always takes a moment: it is part of the welcome, not a delay

const primary = 'inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-paper px-8 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-30'
const quiet = 'text-[15px] text-mute underline decoration-dotted underline-offset-4 transition-colors hover:text-paper'

/** Which part of getting set up each question belongs to: the small label above it. */
const SECTION: Record<Id, string> = {
  welcome: 'Welcome',
  role: 'Welcome',
  method: 'Your account',
  email: 'Your account',
  password: 'Your account',
  code: 'Your account',
  paypal: 'Getting paid',
  name: 'Your page',
  handle: 'Your page',
  pictures: 'Your page',
  accounts: 'Your accounts',
  verify: 'Your accounts',
  happy: 'Nearly there',
  saving: 'Setting up',
  hello: 'All set',
  tour: 'All set',
  done: 'All set',
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/**
 * Types a line out one letter at a time. Every letter is on the page from the first frame, in its final place, and only fades in: the words
 * are kept whole (they never break in the middle) and the cursor takes up no width, so nothing about the line, or anything below it, can move
 * while it is typed. Reduced motion shows it at once.
 */
function Typed({ text, onDone, onReady, speed = 24 }: { text: string; onDone?: () => void; onReady?: () => void; speed?: number }) {
  const [n, setN] = useState(0)
  const done = useRef(onDone)
  done.current = onDone
  const early = useRef(onReady)
  early.current = onReady
  const fired = useRef(false)
  useEffect(() => {
    setN(0)
    fired.current = false
    if (typeof window !== 'undefined' && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('calm'))) {
      setN(text.length)
      return
    }
    let i = 0
    const id = window.setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) window.clearInterval(id)
    }, speed)
    return () => window.clearInterval(id)
  }, [text, speed])
  useEffect(() => {
    // the answer box can appear while the last words are still being typed, so nobody waits for the cursor
    if (!fired.current && text.length && n >= Math.ceil(text.length * 0.6)) {
      fired.current = true
      early.current?.()
    }
    if (n >= text.length && text.length) done.current?.()
  }, [n, text])
  const words = useMemo(() => {
    let at = 0
    return text.split(' ').map((w) => {
      const start = at
      at += w.length + 1
      return { w, start }
    })
  }, [text])
  const cursor = (
    <span aria-hidden="true" className="relative inline-block h-0 w-0 align-baseline">
      <span className={cn('absolute bottom-[-0.12em] left-[0.05em] block h-[0.95em] w-[0.08em] rounded-full bg-[var(--red,currentColor)] shadow-[0_0_14px_rgb(255_31_56/0.7)]', n >= text.length && 'animate-pulse')} />
    </span>
  )
  return (
    <h1 className="min-h-[2.2em] font-display text-[clamp(2rem,5.4vw,3.6rem)] leading-[1.08]">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map(({ w, start }, wi) => (
          <Fragment key={wi}>
            {wi > 0 && ' '}
            <span className="inline-block whitespace-nowrap">
              {Array.from(w).map((c, ci) => (
                <Fragment key={ci}>
                  {n - start === ci && cursor}
                  <span className="transition-[opacity,filter] duration-300 ease-out" style={{ opacity: start + ci < n ? 1 : 0, filter: start + ci < n ? 'blur(0)' : 'blur(6px)' }}>
                    {c}
                  </span>
                </Fragment>
              ))}
              {n - start === w.length && cursor}
            </span>
          </Fragment>
        ))}
      </span>
    </h1>
  )
}

/** Runs a check a moment after typing stops. The spinner shows at once and for long enough to be seen, then the answer. */
function useVerdict(value: string, active: boolean, judge: (v: string) => Promise<Verdict> | Verdict, delay = 380) {
  const [state, setState] = useState<{ st: St; msg: string }>({ st: 'idle', msg: '' })
  const judgeRef = useRef(judge)
  judgeRef.current = judge
  useEffect(() => {
    if (!active) return
    const v = value.trim()
    if (!v) {
      setState({ st: 'idle', msg: '' })
      return
    }
    setState({ st: 'checking', msg: '' })
    let live = true
    const t = window.setTimeout(async () => {
      const started = Date.now()
      const out = await judgeRef.current(v)
      await wait(Math.max(0, 520 - (Date.now() - started)))
      if (live) setState(out ? { st: out.ok ? 'ok' : 'bad', msg: out.msg } : { st: 'idle', msg: '' })
    }, delay)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [value, active, delay])
  return state
}

/** The little icon at the end of a field: a spinner while we look, a green tick when it is good, a red cross when it is not. */
function StatusIcon({ st }: { st: St }) {
  return (
    <span aria-hidden="true" className="absolute right-0 bottom-3 grid size-7 place-items-center">
      <AnimatePresence mode="wait" initial={false}>
        {st === 'checking' && (
          <motion.span key="c" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.18 }}>
            <Loader2 className="size-5 animate-spin text-mute" />
          </motion.span>
        )}
        {st === 'ok' && (
          <motion.span key="o" initial={{ opacity: 0, scale: 0.3, rotate: -40 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 480, damping: 18 }} className="grid size-6 place-items-center rounded-pill bg-[var(--teal,#10b981)] text-black">
            <Check className="size-4" strokeWidth={3} />
          </motion.span>
        )}
        {st === 'bad' && (
          <motion.span key="b" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1, x: [0, -4, 4, -3, 3, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="grid size-6 place-items-center rounded-pill bg-[var(--red,#ef4444)] text-white">
            <X className="size-4" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/** An underlined field that answers as you type. The line itself turns green or red along with the icon. */
function AnswerField({ id, value, onChange, st, msg, prefix, ...rest }: { id: string; value: string; onChange: (v: string) => void; st: St; msg: string; prefix?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id' | 'prefix'>) {
  return (
    <div className="w-full max-w-md">
      <div className={cn('relative flex items-baseline border-b pb-3 transition-colors duration-300', st === 'ok' ? 'border-[var(--teal,#10b981)]' : st === 'bad' ? 'border-[var(--red,#ef4444)]' : 'border-line-strong focus-within:border-[var(--red,#ededed)]')}>
        {prefix && <span className="mr-0.5 text-2xl text-mute">{prefix}</span>}
        <input id={id} autoFocus value={value} onChange={(e) => onChange(e.target.value)} className={cn('w-full rounded-none bg-transparent pr-9 text-2xl outline-none placeholder:text-paper/30', prefix ? 'text-left' : 'text-center')} {...rest} />
        <StatusIcon st={st} />
      </div>
      <p role="status" aria-live="polite" className={cn('mt-3 min-h-[1.25rem] text-sm transition-colors', st === 'ok' ? 'text-[var(--teal,#10b981)]' : st === 'bad' ? 'text-[var(--red,#ef4444)]' : 'text-mute')}>
        {st === 'checking' ? 'Checking' : msg}
      </p>
    </div>
  )
}

/** Choices as two tiles: a number, the big word and what it means. Pointing at one lights its edge in red and lifts it. */
function SplitChoice({ options }: { options: { label: string; hint: string; onClick: () => void }[] }) {
  return (
    <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
      {options.map((o, n) => (
        <button
          key={o.label}
          type="button"
          onClick={o.onClick}
          className="group relative flex flex-col items-start rounded-card border border-line-strong bg-white/[0.02] p-6 text-left outline-none transition-[transform,border-color,background-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[rgb(255_70_90/0.65)] hover:bg-white/[0.05] hover:shadow-[0_24px_60px_-30px_rgb(255_31_56/0.75)] focus-visible:-translate-y-1 focus-visible:border-[rgb(255_70_90/0.65)] focus-visible:ring-2 focus-visible:ring-[rgb(255_31_56/0.4)] active:translate-y-0"
        >
          <span className="font-mono text-[11px] tracking-[0.14em] text-mute">{String(n + 1).padStart(2, '0')}</span>
          <span className="mt-9 font-display text-[clamp(1.8rem,5vw,2.6rem)] leading-none">{o.label}</span>
          <span className="mt-3 max-w-[14rem] text-sm leading-snug text-mute">{o.hint}</span>
          <ArrowRight aria-hidden="true" className="absolute top-6 right-6 size-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
        </button>
      ))}
    </div>
  )
}

/** One rectangular pill holding the photo and the banner side by side. Each half is its own tap target while it is being set up. */
function ProfilePill({ data, onAvatar, onBanner, busy }: { data: Data; onAvatar?: () => void; onBanner?: () => void; busy?: 'avatar' | 'banner' | null }) {
  const editable = Boolean(onAvatar)
  const look = lookById(data.lookId) ?? lookFor(data.handle || data.name || 'x')
  const letter = (data.name.trim()[0] ?? data.handle[0] ?? '').toUpperCase()
  return (
    <div className="flex w-fit max-w-full items-center gap-3 rounded-card border border-line-strong p-3 [--h:clamp(5.5rem,22vw,7.5rem)]">
      <button type="button" disabled={!editable} onClick={onAvatar} aria-label="Profile picture" style={data.avatarUrl ? undefined : { background: avatarCss(look) }} className={cn('relative grid size-[var(--h)] shrink-0 place-items-center overflow-hidden rounded-full outline-none', editable && 'transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-paper/60')}>
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.avatarUrl} alt="Your profile picture" className="size-full object-cover" />
        ) : busy === 'avatar' ? (
          <Loader2 className="size-5 animate-spin text-white" />
        ) : (
          <span className="text-[2.6rem] font-semibold text-white/90">{letter}</span>
        )}
        {editable && !busy && (
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 grid h-7 place-items-center bg-black/45 text-[11px] text-white">
            Change
          </span>
        )}
      </button>
      <button type="button" disabled={!editable} onClick={onBanner} aria-label="Banner" style={data.bannerUrl ? undefined : { background: bannerCss(look) }} className={cn('relative grid h-[var(--h)] shrink-0 aspect-video place-items-center overflow-hidden rounded-card outline-none', editable && 'transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-paper/60')}>
        {data.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.bannerUrl} alt="Your banner" className="size-full object-cover" />
        ) : busy === 'banner' ? (
          <Loader2 className="size-5 animate-spin text-white" />
        ) : null}
        {editable && !busy && (
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 grid h-7 place-items-center bg-black/45 text-[11px] text-white">
            Change banner
          </span>
        )}
      </button>
    </div>
  )
}

/**
 * White liquid that rises up the whole screen while a profile is made, over the length of the wait. Two waves ride its surface
 * and a soft light drifts inside it. The text above it flips to dark where it is over the liquid (a blend), so it always reads.
 */
function LiquidFill() {
  const wave = 'M0 60C200 0 400 120 600 60S1000 0 1200 60 1600 120 1800 60 2200 0 2400 60V120H0Z'
  return (
    <motion.div aria-hidden="true" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 1.1, ease: 'easeOut' } }} className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div initial={{ y: '102%' }} animate={{ y: '-6%' }} transition={{ duration: SETTLE_MS / 1000, ease: [0.42, 0.05, 0.3, 1] }} className="absolute inset-x-0 top-0 h-[112%]">
        <svg viewBox="0 0 2400 120" preserveAspectRatio="none" className="liquid-wave-b absolute -top-[10.5vh] left-0 h-[11vh] w-[200%] text-white/55">
          <path d={wave} fill="currentColor" />
        </svg>
        <svg viewBox="0 0 2400 120" preserveAspectRatio="none" className="liquid-wave-a absolute -top-[8.5vh] left-0 h-[9vh] w-[200%] text-white">
          <path d={wave} fill="currentColor" />
        </svg>
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_45%,#e3eaff_100%)]">
          <span className="liquid-drift-a absolute -top-[10%] -left-[10%] size-[70vmax] rounded-pill bg-[radial-gradient(closest-side,rgb(255_255_255),transparent)]" />
          <span className="liquid-drift-b absolute -right-[15%] bottom-[-20%] size-[60vmax] rounded-pill bg-[radial-gradient(closest-side,rgb(196_214_255/0.8),transparent)]" />
        </div>
      </motion.div>
    </motion.div>
  )
}

/** The line sits in a circle while the wait runs; a thin arc fills round it over the five seconds. */
function SettleOrb({ line, note }: { line: string; note: string }) {
  const C = 2 * Math.PI * 190
  return (
    <div role="status" aria-live="polite" className="relative mx-auto grid aspect-square w-[min(78vw,25rem)] place-items-center">
      <svg aria-hidden="true" viewBox="0 0 400 400" className="absolute inset-0 -rotate-90 drop-shadow-[0_0_10px_rgb(255_31_56/0.55)]">
        <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2" />
        <circle cx="200" cy="200" r="190" fill="none" stroke="var(--red, currentColor)" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} className="orb-fill" style={{ ['--c' as string]: C, animationDuration: `${SETTLE_MS}ms` }} />
      </svg>
      <div className="relative px-[19%] text-center">
        <h1 className="font-display text-[clamp(1.7rem,4.4vw,2.5rem)] leading-[1.08]">{line}</h1>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={note} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-3 text-[15px] text-mute">
            {note}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

const STEP_ORDER: Id[] = ['welcome', 'role', 'method', 'email', 'password', 'code', 'paypal', 'name', 'handle', 'pictures', 'accounts', 'happy', 'saving', 'verify', 'hello', 'tour', 'done']

/**
 * `preview` is an admin's dry run: it starts as a stranger would (signed out), every question works, and nothing is sent to the
 * server or saved. Sign-in is pretended, uploads stay in the browser, and the end of the flow shows two buttons instead of redirecting.
 */
/**
 * `checks` is the `onboarding-checks` switch: Discord sign-ins prove their email too (decided by the page), the signed-in email is
 * shown with a way to use a different one, and the accounts step proves each account with a code in its bio, right in the flow.
 * `looseHandles` is the `username-punctuation` switch: usernames may use dots and dashes.
 */
export function OnboardingFlow({ sessionUser: realUser, initialRole, preview = false, needsVerify = false, initialStep, checks = false, looseHandles = false }: { sessionUser: { name: string; email: string } | null; initialRole?: Role; preview?: boolean; needsVerify?: boolean; initialStep?: string; checks?: boolean; looseHandles?: boolean }) {
  const sessionUser = preview ? null : realUser
  const router = useRouter()
  const mounted = useMounted()
  const { reduced } = useMotionPrefs()
  const { liquidLoader } = useDesign()
  // a dry run (admin previews) can open on any step, with made-up answers, to look at it
  const startAt = preview && initialStep && (STEP_ORDER as string[]).includes(initialStep) ? (initialStep as Id) : 'welcome'
  const [id, setId] = useState<Id>(startAt)
  const [trail, setTrail] = useState<Id[]>([])
  const [ready, setReady] = useState(false) // the line has finished typing
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [forced, setForced] = useState<{ st: St; msg: string } | null>(null) // answers that come from the server, like a code
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null)
  const [tick, setTick] = useState(0) // which reassuring line to show while things are set up
  const [copied, setCopied] = useState(false)
  const [picking, setPicking] = useState<string | null>(null) // which sign-in card was pressed
  const [acc, setAcc] = useState<AccountsStatus>({ added: 0, settled: 0, loaded: false }) // how the accounts step stands: how many were added, how many are proven
  const [data, setData] = useState<Data>({ role: initialRole ?? (startAt !== 'welcome' ? 'clipper' : null), email: sessionUser?.email ?? '', paypal: '', name: sessionUser?.name || (startAt !== 'welcome' ? 'Luna Ray' : ''), handle: startAt !== 'welcome' ? 'luna_ray' : '', avatarKey: null, avatarUrl: null, bannerKey: null, bannerUrl: null, lookId: startAt !== 'welcome' ? lookFor('luna_ray').id : '', linked: {} })
  const [signedIn, setSignedIn] = useState(Boolean(sessionUser))
  const [verifyMode, setVerifyMode] = useState(false) // the code step is proving a signed-in account, not finishing an email sign-up
  const [accountEmail, setAccountEmail] = useState<string | null>(sessionUser?.email || null) // the address of the account they signed in with
  const [switching, setSwitching] = useState(false) // signing out so they can pick a different email
  const avatarInput = useRef<HTMLInputElement>(null)
  const bannerInput = useRef<HTMLInputElement>(null)
  const brand = data.role === 'brand'
  const prevId = trail[trail.length - 1]
  const canBack = Boolean(prevId) && !(signedIn && (['role', 'method', 'email', 'password', 'code'] as Id[]).includes(prevId))
  const go = (next: Id, initialText = '') => {
    setTrail((t) => (id === 'welcome' ? t : [...t, id]))
    setReady(false)
    setError('')
    setForced(null)
    setText(initialText)
    setId(next)
  }
  const back = () => {
    const prev = trail[trail.length - 1]
    if (!prev || !canBack) return
    setTrail((t) => t.slice(0, -1))
    setReady(false)
    setError('')
    setForced(null)
    setText('')
    setId(prev)
  }
  const patch = (p: Partial<Data>) => setData((d) => ({ ...d, ...p }))
  const afterAuth = (role: Role | null): Id => (role === 'brand' ? 'name' : 'paypal')
  const first = data.name.trim().split(/\s+/)[0] || 'there'

  // The line that is shown for each step, and the quiet sentence under it.
  const line = (() => {
    switch (id) {
      case 'welcome':
        return 'Welcome to Logoless.'
      case 'role':
        return 'Are you a creator or a brand?'
      case 'method':
        return 'How would you like to sign in?'
      case 'email':
        return 'What is your email?'
      case 'password':
        return 'Choose a password.'
      case 'code':
        return 'Check your email.'
      case 'paypal':
        return 'What is your PayPal email?'
      case 'name':
        return brand ? 'What is your name or brand called?' : 'What should we call you?'
      case 'handle':
        return 'Pick a username.'
      case 'pictures':
        return 'Make it yours.'
      case 'accounts':
        return 'Where do you post?'
      case 'happy':
        return 'Are you happy with how it looks?'
      case 'saving':
        return 'Setting things up.'
      case 'verify':
        return 'Prove they are yours.'
      case 'hello':
        return `Welcome, ${first}.`
      case 'tour':
        return 'Let us show you around.'
      default:
        return 'You are all set.'
    }
  })()
  const hint: Partial<Record<Id, string>> = {
    email: 'We will send you a code to check it is you.',
    password: 'At least 10 characters.',
    code: `We sent a 6 digit code to ${data.email}.`,
    paypal: 'That is where your earnings go. You can change it later.',
    handle: `This is your address on logoless. ${handleHint(looseHandles)}`,
    pictures: 'Pick a ready-made look, or tap the circle and the wide part to upload your own. You can change it any time.',
    accounts: checks
      ? 'Add each account you post from and prove it is yours with a short code in its bio, right here. Skip it if you like: it is in your dashboard when you are ready.'
      : 'Add the accounts you post from, so we can match your submissions to you. Skip it if you like: it is in your dashboard when you are ready.',
    verify: 'Put a short code in each bio and we confirm the account is yours. Submissions from verified accounts are checked automatically.',
    saving: 'This only takes a moment.',
    hello: 'Your profile page is ready.',
  }

  // a likely fix for a mistyped email ("gmial.com"), offered as a button
  const suggestion = id === 'paypal' || id === 'email' ? checkEmail(text).suggestion : null

  // What each text step expects, and the answer we show as the person types.
  const judge = async (v: string): Promise<Verdict> => {
    if (id === 'email' || id === 'paypal') {
      const c = checkEmail(v)
      if (!c.ok) return { ok: false, msg: c.problem || (id === 'paypal' ? 'That does not look like a PayPal email' : 'That does not look like an email address') }
      if (c.suggestion) return { ok: true, msg: `Did you mean ${c.suggestion}?` }
      return { ok: true, msg: id === 'paypal' ? 'Earnings will be sent here' : 'Looks good' }
    }
    if (id === 'password') return v.length < 10 ? { ok: false, msg: `${10 - v.length} more ${10 - v.length === 1 ? 'character' : 'characters'}` } : { ok: true, msg: v.length >= 14 ? 'Strong' : 'Good' }
    if (id === 'handle') {
      const h = v.toLowerCase()
      if (looseHandles) {
        // reserved words are left to the server, which knows whether this is an admin (a dry run never asks it, so it checks here)
        const problem = handleProblem(h, { loose: true, isAdmin: !preview })
        if (problem) return { ok: false, msg: problem.replace(/\.$/, '') }
        if (preview) return { ok: true, msg: `@${h} is yours` }
        const r = await checkHandle(h)
        return r.available ? { ok: true, msg: `@${h} is yours` } : { ok: false, msg: r.message?.replace(/\.$/, '') ?? 'Already taken' }
      }
      if (!HANDLE_RE.test(h)) return { ok: false, msg: 'Use 1 to 20 letters, numbers or underscores' }
      const free = preview ? true : await checkHandleAvailable(h)
      return free ? { ok: true, msg: `@${h} is yours` } : { ok: false, msg: 'Already taken' }
    }
    return null
  }
  const textStep = (['email', 'password', 'code', 'paypal', 'name', 'handle'] as Id[]).includes(id)
  const verdict = useVerdict(text, textStep && id !== 'code', judge)
  const shown = forced ?? (id === 'code' ? { st: 'idle' as St, msg: '' } : verdict)
  // the name just needs a couple of letters: no spinner, no tick
  const canContinue = id === 'name' ? text.trim().length >= 2 : shown.st === 'ok'

  // Everyone proves their account with a code, except people who signed in with Discord. Email sign-ups already did it.
  const sendVerifyCode = () => fetch('/api/me/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'send' }) }).catch(() => null)
  const enterAfterAuth = (role: Role | null) => {
    if (needsVerify && !preview) {
      setVerifyMode(true)
      void sendVerifyCode()
      return go('code')
    }
    go(afterAuth(role))
  }
  const choose = (role: Role) => {
    patch({ role })
    if (signedIn) enterAfterAuth(role)
    else go('method')
  }

  const provider = async (p: Provider) => {
    if (preview) {
      // pretend the sign-in worked
      setSignedIn(true)
      patch({ email: 'preview@logoless.test', name: data.name || 'Preview Person' })
      if (checks) {
        // with the checks on, Google and Discord sign-ins prove their email with a code too (the preview pretends the code is right)
        setAccountEmail('preview@logoless.test')
        setVerifyMode(true)
        return go('code')
      }
      return go(afterAuth(data.role))
    }
    setBusy(true)
    setError('')
    try {
      const returnTo = `/onboarding?role=${data.role ?? 'clipper'}`
      if (checks && p === 'google') {
        // always show Google's account chooser, so it never quietly picks the wrong account
        const providers = (await fetch('/api/auth/providers').then((r) => r.json()).catch(() => ({}))) as Record<string, unknown>
        if (!providers.google) throw new Error('Google sign-in is not set up yet.')
        await ensureHuman()
        await signIn('google', { callbackUrl: returnTo }, { prompt: 'select_account' })
      } else await signInWithProvider(p, data.role ?? 'clipper', returnTo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Please try again.')
      setBusy(false)
    }
  }

  const submitText = async () => {
    const v = text.trim()
    setError('')
    if (id === 'email') {
      if (shown.st !== 'ok') return
      patch({ email: v })
      return go('password')
    }
    if (id === 'password') {
      if (shown.st !== 'ok') return
      if (preview) return go('code')
      setBusy(true)
      setForced({ st: 'checking', msg: '' })
      try {
        await signUpWithEmail({ email: data.email, password: text, name: '' })
        go('code')
      } catch (e) {
        setForced({ st: 'bad', msg: e instanceof Error ? e.message : 'Could not send the code. Please try again.' })
      } finally {
        setBusy(false)
      }
      return
    }
    if (id === 'code') {
      if (!/^\d{6}$/.test(v)) return
      setBusy(true)
      setForced({ st: 'checking', msg: '' })
      const ok = preview
        ? (await wait(700), true)
        : verifyMode
          ? await fetch('/api/me/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'check', code: v }) }).then((r) => r.ok).catch(() => false)
          : await verifyEmailCode(data.email, v)
      setBusy(false)
      if (!ok) return setForced({ st: 'bad', msg: 'That code is not right. Check the 6 digits in your email.' })
      setForced({ st: 'ok', msg: 'Verified' })
      await wait(800)
      setSignedIn(true)
      return go(afterAuth(data.role))
    }
    if (id === 'paypal') {
      if (shown.st !== 'ok') return
      if (!preview) {
        setBusy(true)
        const res = await fetch('/api/me/paypal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: cleanEmail(v) }) }).catch(() => null)
        setBusy(false)
        if (!res?.ok) return setForced({ st: 'bad', msg: 'We could not save that. Try again, or add it later in Settings.' })
      }
      patch({ paypal: cleanEmail(v) })
      return go('name')
    }
    if (id === 'name') {
      if (!canContinue) return
      patch({ name: v })
      return go('handle', suggestHandle(v, looseHandles))
    }
    if (id === 'handle') {
      if (shown.st !== 'ok') return
      patch({ handle: v.toLowerCase(), lookId: data.lookId || lookFor(v.toLowerCase()).id })
      return go('pictures')
    }
  }

  // The wrong account was picked (say Google chose another one): sign out and come back here to pick again. A preview just pretends.
  const switchAccount = async () => {
    if (preview) {
      setSignedIn(false)
      setVerifyMode(false)
      setAccountEmail(null)
      patch({ email: '' })
      setTrail(data.role ? ['role'] : [])
      setReady(false)
      setError('')
      setForced(null)
      setText('')
      return setId('method')
    }
    setSwitching(true)
    await signOut({ callbackUrl: `/onboarding${data.role ? `?role=${data.role}` : ''}` })
  }
  // A typo in the address of an email sign-up: back to the email step with what they typed, to fix it and get a new code.
  const changeEmail = () => {
    setTrail((t) => {
      const i = t.lastIndexOf('email')
      return i >= 0 ? t.slice(0, i) : t
    })
    setReady(false)
    setError('')
    setForced(null)
    setText(data.email)
    setId('email')
  }
  const showWho = checks && Boolean(accountEmail) && ((id === 'role' && signedIn) || (id === 'code' && verifyMode) || (id === afterAuth(data.role) && signedIn && !trail.includes('code')))
  const showFix = checks && id === 'code' && !verifyMode && !signedIn

  // The code is checked the moment the sixth digit is typed.
  useEffect(() => {
    if (id === 'code' && /^\d{6}$/.test(text.trim()) && !busy) void submitText()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, id])

  const pick = async (kind: 'avatar' | 'banner', f?: File | null) => {
    if (!f || !f.type.startsWith('image/')) return
    setError('')
    const url = URL.createObjectURL(f)
    if (preview) return patch(kind === 'avatar' ? { avatarKey: 'preview', avatarUrl: url } : { bannerKey: 'preview', bannerUrl: url })
    setUploading(kind)
    try {
      const key = await uploadImage(kind, f)
      patch(kind === 'avatar' ? { avatarKey: key, avatarUrl: url } : { bannerKey: key, bannerUrl: url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that picture.')
    } finally {
      setUploading(null)
    }
  }

  // Saving always takes at least five seconds, with a little commentary, so it feels like something is being made for you.
  const save = async () => {
    go('saving')
    const work = async (): Promise<string | null> => {
      if (preview) return null
      const res = await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: data.role ?? 'clipper', name: data.name, handle: data.handle, avatarKey: data.avatarKey ?? (data.lookId ? lookKey(data.lookId) : null), company: brand ? data.name : undefined, linked: Object.fromEntries(Object.entries(data.linked).filter(([, v]) => v.trim())) }),
      }).catch(() => null)
      if (!res?.ok) return ((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? 'We could not save your profile. Please try again.'
      const banner = data.bannerKey ? { bannerKind: 'image', banner: data.bannerKey } : data.lookId ? { bannerKind: 'preset', banner: data.lookId } : null
      if (banner) await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(banner) }).catch(() => null)
      return null
    }
    const [failed] = await Promise.all([work(), wait(SETTLE_MS)])
    if (failed) {
      setTrail((t) => t.slice(0, -1))
      setReady(false)
      setError(failed)
      return setId('happy')
    }
    setReady(false)
    // with `onboarding-checks` on, accounts were proven as they were added; without it, creators prove them now, while they are fresh in mind
    setId(!checks && !brand && VERIFIABLE.some((p) => (data.linked[p] ?? '').trim()) ? 'verify' : 'hello')
  }

  useEffect(() => {
    if (id !== 'saving') return
    setTick(0)
    const t = window.setInterval(() => setTick((n) => n + 1), 1500)
    return () => window.clearInterval(t)
  }, [id])

  const profilePath = `/@${data.handle || 'you'}`
  const profileUrl = `logoless.io${profilePath}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${profileUrl}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* no clipboard: the address is on screen anyway */
    }
  }
  // someone who came from the Get started button in Discord (?ref=discord) ends on the step that links their Discord (see lib/discord/welcome.ts)
  const fromDiscord = () => {
    try {
      if (new URLSearchParams(window.location.search).get('ref') === 'discord') sessionStorage.setItem('ll-ref', 'discord')
      return sessionStorage.getItem('ll-ref') === 'discord'
    } catch {
      return false
    }
  }
  useEffect(() => void fromDiscord(), [])
  const finish = () => (preview ? setId('done') : router.push(fromDiscord() ? '/onboarding/discord' : brand ? '/brand' : '/dashboard'))

  const settling = ['Creating your profile', 'Setting up your page', 'Lining up your dashboard', 'Nearly there'][Math.min(tick, 3)]
  const progress = Math.max(0, STEP_ORDER.indexOf(id)) / (STEP_ORDER.length - 1)

  if (!mounted) return null
  // Portalled to the body: a page transition on an ancestor would otherwise become the "screen" this fixed layer is centred in.
  return createPortal(
    <main className="fixed inset-0 z-[60] overflow-y-auto text-center">
      <AnimatePresence>{id === 'saving' && !reduced && liquidLoader && <LiquidFill key="liquid" />}</AnimatePresence>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[69] h-[2px] bg-white/[0.07]" />
      <div aria-hidden="true" className="fixed top-0 left-0 z-[70] h-[2px] bg-[var(--red,#ededed)] shadow-[0_0_12px_rgb(255_31_56/0.8)] transition-[width] duration-700 ease-out" style={{ width: `${progress * 100}%` }} />
      <Link href="/" aria-label="logoless home" className="fixed top-5 left-5 z-[70] block opacity-80 transition-opacity hover:opacity-100 max-sm:top-4 max-sm:left-4">
        <Logo className="h-8 md:h-9" />
      </Link>
      {preview && (
        <div className="fixed top-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-pill border border-line-strong bg-ink/90 py-1.5 pr-1.5 pl-4 text-[13px] whitespace-nowrap text-mute backdrop-blur max-sm:top-3.5 max-sm:gap-2 max-sm:pl-3 max-sm:text-[12px]">
          Preview. Nothing here is saved.
          <Link href="/admin/previews" className="inline-flex h-8 items-center rounded-pill bg-paper px-4 text-ink">
            Exit
          </Link>
        </div>
      )}

      {/* The line always starts at the same height, so nothing moves while it is typed. */}
      <div className={cn('mx-auto w-full max-w-2xl px-6 pt-[18vh] pb-28', id === 'saving' && !reduced && liquidLoader && 'mix-blend-difference')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            {id === 'saving' ? (
              <SettleOrb line={line} note={settling} />
            ) : (
              <>
            <p className="eyebrow mb-6 justify-center text-[11px]">{SECTION[id]}</p>
            <Typed
              text={line}
              onReady={() => setReady(true)}
              onDone={() => {
                if (id === 'welcome') window.setTimeout(() => (data.role ? (signedIn ? enterAfterAuth(data.role) : go('method')) : go('role')), 500)
              }}
            />
            <p className={cn('mt-3 min-h-[1.5rem] text-[16px] text-mute transition-opacity duration-500', ready && hint[id] ? 'opacity-100' : 'opacity-0')}>{hint[id] ?? ''}</p>
            {(showWho || showFix) && (
              <p className={cn('mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-mute transition-opacity duration-500', ready ? 'opacity-100' : 'pointer-events-none opacity-0')}>
                {showWho ? (
                  switching ? (
                    'Signing you out'
                  ) : (
                    <>
                      Signed in as <span className="break-all text-paper">{accountEmail}</span>.{' '}
                      <button type="button" onClick={() => void switchAccount()} className="underline underline-offset-4 transition-colors hover:text-paper">
                        Not you? Use a different email
                      </button>
                    </>
                  )
                ) : (
                  <>
                    Wrong email?{' '}
                    <button type="button" onClick={changeEmail} className="underline underline-offset-4 transition-colors hover:text-paper">
                      Change it
                    </button>
                  </>
                )}
              </p>
            )}

            <div className={cn('mt-8 flex flex-col items-center transition-opacity duration-500', ready ? 'opacity-100' : 'pointer-events-none opacity-0')}>
              {id === 'role' && (
                <SplitChoice
                  options={[
                    { label: 'Creator', hint: 'Cut content and get paid for every view', onClick: () => choose('clipper') },
                    { label: 'Brand', hint: 'Launch a campaign and reach creators', onClick: () => choose('brand') },
                  ]}
                />
              )}

              {id === 'method' && (
                <>
                  <div className="grid w-full max-w-md gap-3">
                    {([
                      { key: 'google', title: 'Continue with Google', sub: 'You probably already have this.', icon: <BrandIcon name="google" className="size-6" />, run: () => provider('google') },
                      { key: 'discord', title: 'Continue with Discord', sub: 'Easiest for those in our server.', icon: <BrandIcon name="discord" className="size-6" />, run: () => provider('discord') },
                      { key: 'email', title: 'Use your email', sub: 'Works with any email.', icon: <Mail className="size-6" />, run: () => go('email') },
                    ]).map((m) => {
                      const mine = busy && picking === m.key
                      return (
                        <button
                          key={m.key}
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setPicking(m.key)
                            void m.run()
                          }}
                          className={cn('group flex w-full items-center gap-4 rounded-card border border-line-strong bg-white/[0.02] p-3.5 pr-5 text-left outline-none transition-[transform,border-color,background-color,box-shadow,opacity] duration-300 hover:-translate-y-0.5 hover:border-[rgb(255_70_90/0.6)] hover:bg-white/[0.05] hover:shadow-[0_18px_44px_-28px_rgb(255_31_56/0.7)] focus-visible:ring-2 focus-visible:ring-[rgb(255_31_56/0.4)] active:translate-y-0 active:scale-[0.99]', busy && !mine && 'opacity-35')}
                        >
                          <span className="grid size-12 shrink-0 place-items-center rounded-tile border border-line-strong bg-white/[0.05] text-paper transition-colors duration-300 group-hover:border-[rgb(255_70_90/0.5)] group-hover:bg-[rgb(255_31_56/0.12)]">{m.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[17px] font-medium leading-tight">{mine ? `Opening ${m.key === 'google' ? 'Google' : 'Discord'}` : m.title}</span>
                            <span className="mt-0.5 block text-sm text-mute">{m.sub}</span>
                          </span>
                          <span className="grid size-9 shrink-0 place-items-center rounded-tile border border-line-strong transition-colors duration-300 group-hover:border-paper group-hover:bg-paper group-hover:text-ink">
                            {mine ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {error && (
                    <p role="alert" className="mt-5 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                  <p className="mt-8 text-[15px] text-mute">
                    Already have an account?{' '}
                    <Link href="/login" className="text-paper underline underline-offset-4">
                      Log in
                    </Link>
                  </p>
                  <p className="mt-3 max-w-sm text-xs leading-relaxed text-mute/80">
                    By continuing you agree to the{' '}
                    <Link href="/legal/terms" className="underline underline-offset-4 hover:text-paper">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-paper">
                      Privacy Policy
                    </Link>
                    , and confirm you are 16 or older.
                  </p>
                </>
              )}

              {textStep && (
                <form
                  className="flex w-full flex-col items-center"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void submitText()
                  }}
                >
                  <label htmlFor="ob-input" className="sr-only">
                    {line}
                  </label>
                  <AnswerField
                    id="ob-input"
                    key={id}
                    value={text}
                    onChange={(v) => (setText(id === 'code' ? v.replace(/\D/g, '').slice(0, 6) : v), setError(''), setForced(null))}
                    st={id === 'name' ? 'idle' : shown.st}
                    msg={id === 'name' ? '' : shown.msg}
                    prefix={id === 'handle' ? '@' : undefined}
                    type={id === 'password' ? 'password' : id === 'email' || id === 'paypal' ? 'email' : 'text'}
                    inputMode={id === 'code' ? 'numeric' : undefined}
                    autoComplete={id === 'email' ? 'email' : id === 'password' ? 'new-password' : id === 'code' ? 'one-time-code' : 'off'}
                    maxLength={id === 'code' ? 6 : id === 'handle' ? 20 : 80}
                    placeholder={{ email: 'you@example.com', password: 'Your password', code: '000000', paypal: 'you@example.com', name: brand ? 'Your name or brand' : 'Your name', handle: 'username' }[id as string]}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <div className="mt-7 flex flex-col items-center gap-4">
                    {id !== 'code' && (
                      <button type="submit" disabled={busy || !canContinue} className={primary}>
                        {busy ? 'One moment' : 'Continue'}
                      </button>
                    )}
                    {(id === 'paypal' || id === 'email') && suggestion && (
                      <button type="button" onClick={() => (setText(suggestion), setForced(null))} className={quiet}>
                        Use {suggestion}
                      </button>
                    )}
                    {id === 'paypal' && (
                      <button type="button" onClick={() => go('name')} className={quiet}>
                        Add it later
                      </button>
                    )}
                    {id === 'code' && (
                      <button type="button" onClick={() => (preview ? setForced({ st: 'ok', msg: 'We sent a new code' }) : (verifyMode ? sendVerifyCode().then((r) => (r?.ok ? undefined : Promise.reject(new Error('no')))) : resendEmailCode(data.email)).then(() => setForced({ st: 'ok', msg: 'We sent a new code' })).catch(() => setForced({ st: 'bad', msg: 'Could not send a new code' })))} className={quiet}>
                        Send it again
                      </button>
                    )}
                  </div>
                </form>
              )}

              {id === 'pictures' && (
                <>
                  <input ref={avatarInput} type="file" accept="image/*" className="sr-only" aria-label="Choose a profile picture" onChange={(e) => void pick('avatar', e.target.files?.[0])} />
                  <input ref={bannerInput} type="file" accept="image/*" className="sr-only" aria-label="Choose a banner" onChange={(e) => void pick('banner', e.target.files?.[0])} />
                  <ProfilePill data={data} busy={uploading} onAvatar={() => avatarInput.current?.click()} onBanner={() => bannerInput.current?.click()} />
                  <div className="mt-6 flex w-full justify-center">
                    <LookPicker value={data.lookId} onPick={(lookId) => patch({ lookId })} />
                  </div>
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <button type="button" className={primary} disabled={Boolean(uploading)} onClick={() => go(brand ? 'happy' : 'accounts')}>
                      Continue
                    </button>
                  </div>
                </>
              )}

              {id === 'accounts' && checks && (
                <>
                  <AccountsStep
                    preview={preview}
                    onLinked={(platform, handle) =>
                      setData((d) => {
                        const linked = { ...d.linked }
                        if (handle) linked[platform] = handle
                        else delete linked[platform]
                        return { ...d, linked }
                      })
                    }
                    onStatus={setAcc}
                  />
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <button type="button" className={primary} disabled={!acc.loaded || acc.added > acc.settled} onClick={() => go('happy')}>
                      {acc.added === 0 ? 'Skip for now' : 'Continue'}
                    </button>
                    {acc.added > acc.settled && <p className="max-w-xs text-[13px] leading-relaxed text-mute">Check each account you added, or remove it, to carry on.</p>}
                  </div>
                </>
              )}

              {id === 'accounts' && !checks && (
                <>
                  <div className="grid w-full max-w-sm gap-3">
                    {([
                      ['tiktok', 'TikTok', '@username'],
                      ['youtube', 'YouTube', '@channel'],
                      ['instagram', 'Instagram', '@username'],
                    ] as const).map(([key, label, ph]) => (
                      <label key={key} className="flex h-14 items-center gap-3 rounded-tile border border-line-strong bg-white/[0.02] px-5 transition-[border-color,box-shadow] focus-within:border-[rgb(255_70_90/0.7)] focus-within:shadow-[0_0_0_3px_rgb(255_31_56/0.12)]">
                        <BrandIcon name={key} className="size-5 shrink-0 text-mute" />
                        <span className="sr-only">{label}</span>
                        <input
                          value={data.linked[key] ?? ''}
                          onChange={(e) => patch({ linked: { ...data.linked, [key]: e.target.value.replace(/\s/g, '').slice(0, 60) } })}
                          placeholder={ph}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-mute/60"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <button type="button" className={primary} onClick={() => go('happy')}>
                      {Object.values(data.linked).some((v) => v.trim()) ? 'Continue' : 'Skip for now'}
                    </button>
                  </div>
                </>
              )}

              {id === 'happy' && (
                <>
                  <ProfilePill data={data} />
                  <p className="mt-5 font-display text-2xl leading-none">{data.name}</p>
                  <p className="mt-1.5 text-[15px] text-mute">@{data.handle}</p>
                  <div className="mt-8 w-full">
                    <SplitChoice
                      options={[
                        { label: 'Yes', hint: 'Looks good to me', onClick: () => void save() },
                        { label: 'Not yet', hint: 'Let me change something', onClick: back },
                      ]}
                    />
                  </div>
                </>
              )}

              {id === 'verify' && <VerifyAccounts linked={data.linked} preview={preview} onDone={() => go('hello')} buttonClass={primary} quietClass={quiet} inline={false} />}

              {id === 'hello' && (
                <>
                  <p className="text-[15px] text-mute">This is where people find you</p>
                  <div className="mt-4 flex items-center gap-2 rounded-pill border border-line-strong py-2 pr-2 pl-6 text-[17px]">
                    <span className="font-mono">{profileUrl}</span>
                    <button type="button" onClick={copy} aria-label="Copy the address" className="grid size-10 place-items-center rounded-pill text-mute transition-colors hover:bg-paper/10 hover:text-paper">
                      {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-mute">It is public, so you can share it anywhere. You can also open it from your dashboard and the menu.</p>
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <button type="button" onClick={() => go('tour')} className={primary}>
                      Show me around
                    </button>
                    <button type="button" onClick={() => go('done')} className={quiet}>
                      Skip the tour
                    </button>
                  </div>
                </>
              )}

              {id === 'tour' && <Tour role={data.role ?? 'clipper'} onFinish={() => go('done')} primary={primary} quiet={quiet} />}

              {id === 'done' && (
                <>
                  <p className="max-w-sm text-[16px] leading-relaxed text-mute">{brand ? 'Your dashboard has a short guide for the rest: adding funds and making your first campaign.' : 'Your dashboard has a short guide for the rest: linking your accounts, connecting Discord and sending your first submission.'}</p>
                  {preview ? (
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <button type="button" className={cn(primary, 'bg-transparent text-paper ring-1 ring-line-strong hover:bg-paper/10')} onClick={() => window.location.reload()}>
                        Run it again
                      </button>
                      <Link href="/admin/previews" className={primary}>
                        Back to previews
                      </Link>
                    </div>
                  ) : (
                    <button type="button" onClick={finish} className={cn(primary, 'mt-8')}>
                      Go to your dashboard
                    </button>
                  )}
                </>
              )}
            </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && !textStep && id !== 'pictures' && (
          <p role="alert" className="mt-6 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      {canBack && id !== 'saving' && id !== 'verify' && id !== 'hello' && id !== 'tour' && id !== 'done' && id !== 'happy' && (
        <button type="button" onClick={back} className="group fixed bottom-5 left-1/2 z-[70] inline-flex -translate-x-1/2 items-center gap-2 rounded-pill border border-line bg-ink/80 px-4 py-2 text-[14px] text-mute backdrop-blur-md transition-colors hover:border-line-strong hover:text-paper">
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" /> Back
        </button>
      )}
    </main>,
    document.body,
  )
}
