'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Banknote, Check, CircleDollarSign, Clapperboard, Compass, Copy, ImagePlus, LayoutDashboard, Loader2, Mail, Megaphone, Plus, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrandIcon } from '@/components/brand-icon'
import { useTheme } from '@/components/shell/theme-toggle'
import { useMounted } from '@/hooks/use-motion-prefs'
import { type Provider, type Role, signInWithProvider, signUpWithEmail } from '@/lib/auth'
import { uploadImage } from '@/lib/image-client'
import { checkHandleAvailable, resendEmailCode, verifyEmailCode } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

type Id = 'welcome' | 'role' | 'method' | 'email' | 'password' | 'code' | 'paypal' | 'name' | 'handle' | 'pictures' | 'happy' | 'theme' | 'saving' | 'hello' | 'tour' | 'done'

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
}

type St = 'idle' | 'checking' | 'ok' | 'bad'
type Verdict = { ok: boolean; msg: string } | null

const HANDLE_RE = /^[a-z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SETTLE_MS = 5200 // "setting things up" always takes a moment: it is part of the welcome, not a delay

const primary = 'inline-flex h-14 items-center justify-center rounded-full bg-paper px-10 text-[17px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-30'
const quiet = 'text-[15px] text-mute underline underline-offset-4 transition-colors hover:text-paper'

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/**
 * Types a line out one letter at a time. The letters that are still to come are already on the page (invisible), so the line
 * takes its final shape from the first letter and nothing below it ever moves. Reduced motion shows it at once.
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
  return (
    <h1 className="min-h-[2.2em] font-display text-[clamp(2rem,5.4vw,3.6rem)] leading-[1.08]">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        <span className={cn('ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] bg-current', n >= text.length && 'animate-pulse')} />
        <span className="invisible">{text.slice(n)}</span>
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
          <motion.span key="o" initial={{ opacity: 0, scale: 0.3, rotate: -40 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 480, damping: 18 }} className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="size-4" strokeWidth={3} />
          </motion.span>
        )}
        {st === 'bad' && (
          <motion.span key="b" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1, x: [0, -4, 4, -3, 3, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="grid size-6 place-items-center rounded-full bg-red-500 text-white">
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
      <div className={cn('relative flex items-baseline border-b pb-3 transition-colors duration-300', st === 'ok' ? 'border-emerald-500' : st === 'bad' ? 'border-red-500' : 'border-line-strong focus-within:border-paper')}>
        {prefix && <span className="mr-0.5 text-2xl text-mute">{prefix}</span>}
        <input id={id} autoFocus value={value} onChange={(e) => onChange(e.target.value)} className={cn('w-full rounded-none bg-transparent pr-9 text-2xl outline-none placeholder:text-paper/30', prefix ? 'text-left' : 'text-center')} {...rest} />
        <StatusIcon st={st} />
      </div>
      <p role="status" aria-live="polite" className={cn('mt-3 min-h-[1.25rem] text-sm transition-colors', st === 'ok' ? 'text-emerald-500' : st === 'bad' ? 'text-red-500' : 'text-mute')}>
        {st === 'checking' ? 'Checking' : msg}
      </p>
    </div>
  )
}

/** Choices as big words side by side. Pointing at one makes it grow and the others step back. */
function SplitChoice({ options }: { options: { label: string; hint: string; onClick: () => void }[] }) {
  return (
    <div className="flex w-full max-w-xl divide-x divide-line-strong [&:hover>button:not(:hover)]:opacity-35">
      {options.map((o) => (
        <button key={o.label} type="button" onClick={o.onClick} className="group flex flex-1 flex-col items-center px-4 py-6 text-center outline-none transition-[transform,opacity] duration-300 hover:scale-[1.04] focus-visible:scale-[1.04]">
          <span className="font-display text-[clamp(1.8rem,5vw,3rem)] leading-none">{o.label}</span>
          <span className="mt-3 max-w-[11rem] text-sm leading-snug text-mute">{o.hint}</span>
          <ArrowRight aria-hidden="true" className="mt-4 size-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
        </button>
      ))}
    </div>
  )
}

/** One rectangular pill holding the photo and the banner side by side. Each half is its own tap target while it is being set up. */
function ProfilePill({ data, onAvatar, onBanner, busy }: { data: Data; onAvatar?: () => void; onBanner?: () => void; busy?: 'avatar' | 'banner' | null }) {
  const editable = Boolean(onAvatar)
  return (
    <div className="flex w-fit max-w-full items-center gap-3 rounded-[2rem] border border-line-strong p-3 [--h:clamp(5.5rem,22vw,7.5rem)]">
      <button type="button" disabled={!editable} onClick={onAvatar} aria-label="Profile picture" className={cn('relative grid size-[var(--h)] shrink-0 place-items-center overflow-hidden rounded-full outline-none', data.avatarUrl ? 'bg-raised' : 'border border-dashed border-line-strong text-mute', editable && 'transition-colors hover:border-paper hover:text-paper focus-visible:ring-2 focus-visible:ring-paper/60')}>
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.avatarUrl} alt="Your profile picture" className="size-full object-cover" />
        ) : busy === 'avatar' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs">
            <Plus className="size-5" />
            Photo
          </span>
        )}
      </button>
      <button type="button" disabled={!editable} onClick={onBanner} aria-label="Banner" className={cn('relative grid h-[var(--h)] shrink-0 aspect-video place-items-center overflow-hidden rounded-[1.4rem] outline-none', data.bannerUrl ? 'bg-raised' : 'border border-dashed border-line-strong text-mute', editable && 'transition-colors hover:border-paper hover:text-paper focus-visible:ring-2 focus-visible:ring-paper/60')}>
        {data.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.bannerUrl} alt="Your banner" className="size-full object-cover" />
        ) : busy === 'banner' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <span className="flex items-center gap-2 text-sm">
            <ImagePlus className="size-5" />
            Banner
          </span>
        )}
      </button>
    </div>
  )
}

/** Light or dark, shown as two tiny screens. Picking one changes the page right now. */
function ThemePick({ light, onPick }: { light: boolean; onPick: (t: 'dark' | 'light') => void }) {
  return (
    <div className="flex justify-center gap-5">
      {(['dark', 'light'] as const).map((t) => {
        const on = (light ? 'light' : 'dark') === t
        return (
          <button key={t} type="button" aria-pressed={on} onClick={() => onPick(t)} className="group flex flex-col items-center gap-3 outline-none">
            <span data-keep className={cn('relative block h-24 w-36 overflow-hidden rounded-2xl border-2 transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-paper/60', t === 'dark' ? 'bg-[#0b0b0d]' : 'bg-[#f7f7f5]', on ? 'scale-105 border-emerald-500' : 'border-line-strong opacity-70 group-hover:opacity-100')}>
              <span className={cn('absolute top-3 left-3 h-2 w-14 rounded-full', t === 'dark' ? 'bg-white/80' : 'bg-black/75')} />
              <span className={cn('absolute top-7 left-3 h-1.5 w-20 rounded-full', t === 'dark' ? 'bg-white/30' : 'bg-black/25')} />
              <span className={cn('absolute right-3 bottom-3 h-7 w-12 rounded-xl', t === 'dark' ? 'bg-white/90' : 'bg-black/85')} />
              {on && (
                <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={cn('text-[15px] transition-colors', on ? 'text-paper' : 'text-mute')}>{t === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        )
      })}
    </div>
  )
}

/** A row of dots that rise and fall one after another. */
function DotWave() {
  return (
    <span role="status" aria-label="Loading" className="flex items-end justify-center gap-2.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span key={i} className="block size-3 rounded-full bg-paper" animate={{ y: [0, -16, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }} />
      ))}
    </span>
  )
}

type TourItem = { icon: React.ComponentType<{ className?: string }>; label: string; text: string }
const TOUR: Record<Role, TourItem[]> = {
  clipper: [
    { icon: LayoutDashboard, label: 'Overview', text: 'Brands post campaigns, you cut clips, and approved views turn into money. This page shows your balance and what to do next.' },
    { icon: Megaphone, label: 'Campaigns', text: 'Every live campaign is here. Open one for the brief, the rate and the rules, then post your clip.' },
    { icon: Clapperboard, label: 'Clips', text: 'Paste the link to a clip you posted. We check it in seconds, and a person looks at anything unclear.' },
    { icon: CircleDollarSign, label: 'Earnings', text: 'Approved views are counted here. Withdraw to your PayPal once you reach the minimum.' },
    { icon: UserRound, label: 'Profile', text: 'Your public page. Write a bio, choose your colours and decide which accounts people can see.' },
  ],
  brand: [
    { icon: LayoutDashboard, label: 'Overview', text: 'You post a campaign, creators cut clips, and you only pay for approved views. This page shows how it is going.' },
    { icon: Megaphone, label: 'Campaigns', text: 'Launch a campaign with a rate, a budget and a brief. Pause or top it up any time.' },
    { icon: Clapperboard, label: 'Clips', text: 'Every clip made for you, with its views and its status.' },
    { icon: Banknote, label: 'Account', text: 'Add money to your budget and manage your details.' },
  ],
}

/** A tiny dashboard with a highlight that slides down it while a line explains each part. */
function MiniDash({ role, onFinish }: { role: Role; onFinish: () => void }) {
  const items = TOUR[role]
  const [i, setI] = useState(0)
  const last = i === items.length - 1
  return (
    <div className="w-full max-w-xl">
      <div className="grid overflow-hidden rounded-[2rem] border border-line-strong sm:grid-cols-[11rem_1fr]">
        <ul className="grid gap-1 border-b border-line-strong p-3 sm:border-r sm:border-b-0" aria-label="Dashboard sections">
          {items.map((it, n) => (
            <li key={it.label}>
              <button type="button" onClick={() => setI(n)} aria-current={n === i} className="relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-paper/60">
                {n === i && <motion.span layoutId="tour-hl" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-paper" />}
                <it.icon className={cn('relative size-4', n === i ? 'text-ink' : 'text-mute')} />
                <span className={cn('relative', n === i ? 'text-ink' : 'text-mute')}>{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex min-h-[10rem] items-center p-6 text-left sm:min-h-[14rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
              <p className="font-display text-3xl leading-none">{items[i].label}</p>
              <p className="mt-3 text-[16px] leading-relaxed text-mute">{items[i].text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button type="button" onClick={() => (i === 0 ? undefined : setI(i - 1))} disabled={i === 0} className={cn(quiet, 'disabled:invisible')}>
          Back
        </button>
        <button type="button" onClick={() => (last ? onFinish() : setI(i + 1))} className={primary}>
          {last ? 'Got it' : 'Next'}
        </button>
      </div>
    </div>
  )
}

const STEP_ORDER: Id[] = ['welcome', 'role', 'method', 'email', 'password', 'code', 'paypal', 'name', 'handle', 'pictures', 'happy', 'theme', 'saving', 'hello', 'tour', 'done']

/**
 * `preview` is an admin's dry run: it starts as a stranger would (signed out), every question works, and nothing is sent to the
 * server or saved. Sign-in is pretended, uploads stay in the browser, and the end of the flow shows two buttons instead of redirecting.
 */
export function OnboardingFlow({ sessionUser: realUser, initialRole, preview = false }: { sessionUser: { name: string; email: string } | null; initialRole?: Role; preview?: boolean }) {
  const sessionUser = preview ? null : realUser
  const router = useRouter()
  const theme = useTheme()
  const mounted = useMounted()
  const [id, setId] = useState<Id>('welcome')
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
  const [data, setData] = useState<Data>({ role: initialRole ?? null, email: sessionUser?.email ?? '', paypal: '', name: sessionUser?.name ?? '', handle: '', avatarKey: null, avatarUrl: null, bannerKey: null, bannerUrl: null })
  const [signedIn, setSignedIn] = useState(Boolean(sessionUser))
  const avatarInput = useRef<HTMLInputElement>(null)
  const bannerInput = useRef<HTMLInputElement>(null)
  const brand = data.role === 'brand'
  const prevId = trail[trail.length - 1]
  const canBack = Boolean(prevId) && !(signedIn && (['role', 'method', 'email', 'password', 'code'] as Id[]).includes(prevId))
  // a preview may change the colour while the admin tries that step; put it back when they leave
  const startedAs = useRef(theme.light ? 'light' : 'dark')
  useEffect(() => {
    if (!preview) return
    const was = startedAs.current as 'light' | 'dark'
    return () => theme.set(was)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview])

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
      case 'happy':
        return 'Are you happy with how it looks?'
      case 'theme':
        return 'Light or dark?'
      case 'saving':
        return 'Setting things up.'
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
    handle: 'This is your address on logoless. Letters, numbers and underscores.',
    pictures: 'Tap the circle for a photo and the wide part for a banner.',
    theme: 'You can change it any time in Settings.',
    saving: 'This only takes a moment.',
    hello: 'Your profile page is ready.',
  }

  // What each text step expects, and the answer we show as the person types.
  const judge = async (v: string): Promise<Verdict> => {
    if (id === 'email') return EMAIL_RE.test(v) ? { ok: true, msg: 'Looks good' } : { ok: false, msg: 'That does not look like an email address' }
    if (id === 'password') return v.length < 10 ? { ok: false, msg: `${10 - v.length} more ${10 - v.length === 1 ? 'character' : 'characters'}` } : { ok: true, msg: v.length >= 14 ? 'Strong' : 'Good' }
    if (id === 'paypal') return EMAIL_RE.test(v) ? { ok: true, msg: 'Earnings will be sent here' } : { ok: false, msg: 'That does not look like a PayPal email' }
    if (id === 'handle') {
      const h = v.toLowerCase()
      if (!HANDLE_RE.test(h)) return { ok: false, msg: 'Use 3 to 20 letters, numbers or underscores' }
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

  const choose = (role: Role) => {
    patch({ role })
    go(signedIn ? afterAuth(role) : 'method')
  }

  const provider = async (p: Provider) => {
    if (preview) {
      // pretend the sign-in worked
      setSignedIn(true)
      patch({ email: 'preview@logoless.test', name: data.name || 'Preview Person' })
      return go(afterAuth(data.role))
    }
    setBusy(true)
    setError('')
    try {
      await signInWithProvider(p, data.role ?? 'clipper', `/onboarding?role=${data.role ?? 'clipper'}`)
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
      const ok = preview ? (await wait(700), true) : await verifyEmailCode(data.email, v)
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
        const res = await fetch('/api/me/paypal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: v }) }).catch(() => null)
        setBusy(false)
        if (!res?.ok) return setForced({ st: 'bad', msg: 'We could not save that. Try again, or add it later in Settings.' })
      }
      patch({ paypal: v })
      return go('name')
    }
    if (id === 'name') {
      if (!canContinue) return
      patch({ name: v })
      return go('handle', v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))
    }
    if (id === 'handle') {
      if (shown.st !== 'ok') return
      patch({ handle: v.toLowerCase() })
      return go('pictures')
    }
  }

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
        body: JSON.stringify({ role: data.role ?? 'clipper', name: data.name, handle: data.handle, avatarKey: data.avatarKey, company: brand ? data.name : undefined }),
      }).catch(() => null)
      if (!res?.ok) return ((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? 'We could not save your profile. Please try again.'
      if (data.bannerKey) await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bannerKind: 'image', banner: data.bannerKey }) }).catch(() => null)
      return null
    }
    const [failed] = await Promise.all([work(), wait(SETTLE_MS)])
    if (failed) {
      setTrail((t) => t.slice(0, -1))
      setReady(false)
      setError(failed)
      return setId('theme')
    }
    setReady(false)
    setId('hello')
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
  const finish = () => (preview ? setId('done') : router.push(brand ? '/brand' : '/dashboard'))

  const settling = ['Creating your profile', 'Setting up your page', 'Lining up your dashboard', 'Nearly there'][Math.min(tick, 3)]
  const progress = Math.max(0, STEP_ORDER.indexOf(id)) / (STEP_ORDER.length - 1)

  if (!mounted) return null
  // Portalled to the body: a page transition on an ancestor would otherwise become the "screen" this fixed layer is centred in.
  return createPortal(
    <main className="fixed inset-0 z-[60] overflow-y-auto text-center">
      <div aria-hidden="true" className="fixed top-0 left-0 z-[70] h-[2px] bg-paper transition-[width] duration-700 ease-out" style={{ width: `${progress * 100}%` }} />
      {preview && (
        <div className="fixed top-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full border border-line-strong bg-ink/90 py-1.5 pr-1.5 pl-4 text-[13px] text-mute backdrop-blur">
          Preview. Nothing here is saved.
          <Link href="/admin/previews" className="inline-flex h-8 items-center rounded-full bg-paper px-4 text-ink">
            Exit
          </Link>
        </div>
      )}

      {/* The line always starts at the same height, so nothing moves while it is typed. */}
      <div className="mx-auto w-full max-w-2xl px-6 pt-[20vh] pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <Typed
              text={line}
              onReady={() => setReady(true)}
              onDone={() => {
                if (id === 'welcome') window.setTimeout(() => go(data.role ? (signedIn ? afterAuth(data.role) : 'method') : 'role'), 500)
              }}
            />
            <p className={cn('mt-3 min-h-[1.5rem] text-[16px] text-mute transition-opacity duration-500', ready && hint[id] ? 'opacity-100' : 'opacity-0')}>{hint[id] ?? ''}</p>

            <div className={cn('mt-8 flex flex-col items-center transition-opacity duration-500', ready ? 'opacity-100' : 'pointer-events-none opacity-0')}>
              {id === 'role' && (
                <SplitChoice
                  options={[
                    { label: 'Creator', hint: 'Cut clips and get paid for every view', onClick: () => choose('clipper') },
                    { label: 'Brand', hint: 'Launch a campaign and reach clippers', onClick: () => choose('brand') },
                  ]}
                />
              )}

              {id === 'method' && (
                <>
                  <div className="grid w-full max-w-md gap-3">
                    {([
                      { key: 'google', title: 'Continue with Google', sub: 'One tap, no password to remember', icon: <BrandIcon name="google" className="size-6" />, run: () => provider('google') },
                      { key: 'discord', title: 'Continue with Discord', sub: 'Use the account you already have', icon: <BrandIcon name="discord" className="size-6" />, run: () => provider('discord') },
                      { key: 'email', title: 'Use your email', sub: 'We send a code to check it is you', icon: <Mail className="size-6" />, run: () => go('email') },
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
                          className={cn('group flex w-full items-center gap-4 rounded-[1.7rem] border border-line-strong p-3.5 pr-5 text-left outline-none transition-[transform,border-color,background-color,opacity] duration-300 hover:-translate-y-0.5 hover:border-paper/70 hover:bg-paper/[0.05] focus-visible:ring-2 focus-visible:ring-paper/60 active:translate-y-0 active:scale-[0.99]', busy && !mine && 'opacity-35')}
                        >
                          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-paper text-ink">{m.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[17px] font-medium leading-tight">{mine ? `Opening ${m.key === 'google' ? 'Google' : 'Discord'}` : m.title}</span>
                            <span className="mt-0.5 block text-sm text-mute">{m.sub}</span>
                          </span>
                          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong transition-colors duration-300 group-hover:border-paper group-hover:bg-paper group-hover:text-ink">
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
                    .
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
                    {id === 'paypal' && (
                      <button type="button" onClick={() => go('name')} className={quiet}>
                        Add it later
                      </button>
                    )}
                    {id === 'code' && (
                      <button type="button" onClick={() => (preview ? setForced({ st: 'ok', msg: 'We sent a new code' }) : resendEmailCode(data.email).then(() => setForced({ st: 'ok', msg: 'We sent a new code' })).catch(() => setForced({ st: 'bad', msg: 'Could not send a new code' })))} className={quiet}>
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
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <button type="button" className={primary} disabled={Boolean(uploading)} onClick={() => go('happy')}>
                      {data.avatarUrl || data.bannerUrl ? 'Continue' : 'Skip for now'}
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
                        { label: 'Yes', hint: 'Looks good to me', onClick: () => go('theme') },
                        { label: 'Not yet', hint: 'Let me change something', onClick: back },
                      ]}
                    />
                  </div>
                </>
              )}

              {id === 'theme' && (
                <>
                  <ThemePick light={theme.light} onPick={(t) => theme.set(t)} />
                  {error && (
                    <p role="alert" className="mt-6 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                  <button type="button" onClick={() => void save()} className={cn(primary, 'mt-10')}>
                    Finish
                  </button>
                </>
              )}

              {id === 'saving' && (
                <div className="flex flex-col items-center gap-8">
                  <DotWave />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p key={settling} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="text-[16px] text-mute">
                      {settling}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              {id === 'hello' && (
                <>
                  <p className="text-[15px] text-mute">This is where people find you</p>
                  <div className="mt-4 flex items-center gap-2 rounded-full border border-line-strong py-2 pr-2 pl-6 text-[17px]">
                    <span className="font-mono">{profileUrl}</span>
                    <button type="button" onClick={copy} aria-label="Copy the address" className="grid size-10 place-items-center rounded-full text-mute transition-colors hover:bg-paper/10 hover:text-paper">
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

              {id === 'tour' && <MiniDash role={data.role ?? 'clipper'} onFinish={() => go('done')} />}

              {id === 'done' && (
                <>
                  <p className="max-w-sm text-[16px] leading-relaxed text-mute">{brand ? 'Launch your first campaign whenever you are ready.' : 'A good first step is to write a short bio and join your first campaign. You will find both in your dashboard.'}</p>
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
          </motion.div>
        </AnimatePresence>

        {error && !textStep && id !== 'pictures' && id !== 'theme' && (
          <p role="alert" className="mt-6 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      {canBack && id !== 'saving' && id !== 'hello' && id !== 'tour' && id !== 'done' && id !== 'happy' && (
        <button type="button" onClick={back} className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[15px] text-mute transition-colors hover:text-paper">
          Back
        </button>
      )}
    </main>,
    document.body,
  )
}
