'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { useTheme } from '@/components/shell/theme-toggle'
import { type Provider, type Role, signInWithProvider, signUpWithEmail } from '@/lib/auth'
import { uploadImage } from '@/lib/image-client'
import { checkHandleAvailable, resendEmailCode, verifyEmailCode } from '@/lib/onboarding'
import { buildLink } from '@/lib/profile-style'
import { cn } from '@/lib/utils'

type Id = 'welcome' | 'role' | 'method' | 'email' | 'password' | 'code' | 'paypal' | 'name' | 'handle' | 'avatar' | 'banner' | 'bio' | 'socials' | 'theme' | 'saving' | 'done'

type Data = {
  role: Role | null
  email: string
  paypal: string
  name: string
  handle: string
  avatarKey: string | null
  avatarUrl: string | null
  bannerKey: string | null
  bio: string
  linked: { tiktok: string; youtube: string; instagram: string; website: string }
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Types a line out one letter at a time, then tells the page it is done. Reduced motion shows it at once. */
function Typed({ text, onDone, speed = 30 }: { text: string; onDone?: () => void; speed?: number }) {
  const [n, setN] = useState(0)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    setN(0)
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
    if (n >= text.length && text.length) done.current?.()
  }, [n, text])
  return (
    <h1 className="font-display text-[clamp(2rem,5.4vw,3.6rem)] leading-[1.08]">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        <span className={cn('ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] bg-current', n >= text.length && 'animate-pulse')} />
      </span>
    </h1>
  )
}

const pill = 'inline-flex h-14 items-center justify-center gap-3 rounded-full border border-line-strong px-8 text-[17px] transition-colors hover:border-paper hover:bg-paper/[0.06] disabled:opacity-40'
const primary = 'inline-flex h-14 items-center justify-center rounded-full bg-paper px-10 text-[17px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40'

export function OnboardingFlow({ sessionUser, initialRole }: { sessionUser: { name: string; email: string } | null; initialRole?: Role }) {
  const router = useRouter()
  const theme = useTheme()
  const [id, setId] = useState<Id>('welcome')
  const [trail, setTrail] = useState<Id[]>([])
  const [ready, setReady] = useState(false) // the line has finished typing
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [handleState, setHandleState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle')
  const [data, setData] = useState<Data>({ role: initialRole ?? null, email: sessionUser?.email ?? '', paypal: '', name: sessionUser?.name ?? '', handle: '', avatarKey: null, avatarUrl: null, bannerKey: null, bio: '', linked: { tiktok: '', youtube: '', instagram: '', website: '' } })
  const [signedIn, setSignedIn] = useState(Boolean(sessionUser))
  const file = useRef<HTMLInputElement>(null)
  const brand = data.role === 'brand'
  const prevId = trail[trail.length - 1]
  const canBack = Boolean(prevId) && !(signedIn && (['role', 'method', 'email', 'password', 'code'] as Id[]).includes(prevId))

  const go = (next: Id) => {
    setTrail((t) => (id === 'welcome' ? t : [...t, id]))
    setReady(false)
    setError('')
    setText('')
    setId(next)
  }
  const back = () => {
    const prev = trail[trail.length - 1]
    if (!prev || !canBack) return
    setTrail((t) => t.slice(0, -1))
    setReady(false)
    setError('')
    setText('')
    setId(prev)
  }
  const patch = (p: Partial<Data>) => setData((d) => ({ ...d, ...p }))

  // The line that is shown for each step.
  const line = useMemo(() => {
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
        return `We sent a code to ${data.email}. What is it?`
      case 'paypal':
        return 'What is your PayPal email? That is where your earnings go.'
      case 'name':
        return brand ? 'What is your name or brand called?' : 'What should we call you?'
      case 'handle':
        return 'Pick a username.'
      case 'avatar':
        return 'Add a profile picture.'
      case 'banner':
        return 'Add a banner.'
      case 'bio':
        return 'Write a short bio.'
      case 'socials':
        return brand ? 'Where can people find you?' : 'Link your accounts.'
      case 'theme':
        return 'Light or dark?'
      case 'saving':
        return 'Setting things up.'
      default:
        return 'You are all set.'
    }
  }, [id, data.email, brand])

  // Once the first line has typed, move on. Anyone who is already signed in skips the sign-in questions.
  const afterWelcome = () => window.setTimeout(() => go(data.role ? (signedIn ? afterAuth(data.role) : 'method') : 'role'), 700)
  const afterAuth = (role: Role | null): Id => (role === 'brand' ? 'name' : 'paypal')

  // Check the username as it is typed.
  useEffect(() => {
    if (id !== 'handle') return
    const h = text.trim().toLowerCase()
    if (!h) return setHandleState('idle')
    if (!HANDLE_RE.test(h)) return setHandleState('invalid')
    setHandleState('checking')
    const t = window.setTimeout(async () => setHandleState((await checkHandleAvailable(h)) ? 'ok' : 'taken'), 350)
    return () => window.clearTimeout(t)
  }, [text, id])

  const choose = (role: Role) => {
    patch({ role })
    go(signedIn ? afterAuth(role) : 'method')
  }

  const provider = async (p: Provider) => {
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
      if (!EMAIL_RE.test(v)) return setError('That does not look like an email address.')
      patch({ email: v })
      return go('password')
    }
    if (id === 'password') {
      if (v.length < 10) return setError('Use at least 10 characters.')
      setBusy(true)
      try {
        await signUpWithEmail({ email: data.email, password: text, name: '' })
        go('code')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not send the code. Please try again.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (id === 'code') {
      setBusy(true)
      const ok = await verifyEmailCode(data.email, v)
      setBusy(false)
      if (!ok) return setError('That code is not right. Check the 6 digits in your email.')
      setSignedIn(true)
      return go(afterAuth(data.role))
    }
    if (id === 'paypal') {
      if (v && !EMAIL_RE.test(v)) return setError('That does not look like a PayPal email.')
      if (v) {
        setBusy(true)
        const res = await fetch('/api/me/paypal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: v }) }).catch(() => null)
        setBusy(false)
        if (!res?.ok) return setError('We could not save that. Try again, or add it later in Settings.')
        patch({ paypal: v })
      }
      return go('name')
    }
    if (id === 'name') {
      if (v.length < 2) return setError('Add a name.')
      patch({ name: v })
      return go('handle')
    }
    if (id === 'handle') {
      const h = v.toLowerCase()
      if (!HANDLE_RE.test(h)) return setError('Use 3 to 20 letters, numbers or underscores.')
      if (handleState === 'taken') return setError('That username is taken.')
      patch({ handle: h })
      return go('avatar')
    }
    if (id === 'bio') {
      patch({ bio: v })
      return go('socials')
    }
  }

  const pick = async (kind: 'avatar' | 'banner', f?: File | null) => {
    if (!f || !f.type.startsWith('image/')) return
    setBusy(true)
    setError('')
    try {
      const key = await uploadImage(kind, f)
      if (kind === 'avatar') patch({ avatarKey: key, avatarUrl: `/api/img/${key}` })
      else patch({ bannerKey: key })
      go(kind === 'avatar' ? 'banner' : 'bio')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that picture.')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    go('saving')
    const linked: Record<string, string> = {}
    for (const k of ['tiktok', 'youtube', 'instagram'] as const) if (data.linked[k].trim()) linked[k] = data.linked[k].trim()
    const res = await fetch('/api/me/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: data.role ?? 'clipper', name: data.name, handle: data.handle, bio: data.bio, avatarKey: data.avatarKey, linked, company: brand ? data.name : undefined, website: brand ? data.linked.website : undefined }),
    }).catch(() => null)
    if (!res?.ok) {
      const j = (await res?.json().catch(() => ({}))) as { error?: string }
      setError(j?.error ?? 'We could not save your profile. Please try again.')
      setTrail((t) => t.slice(0, -1))
      setId('socials')
      return
    }
    if (data.bannerKey) await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bannerKind: 'image', banner: data.bannerKey }) }).catch(() => null)
    setReady(false)
    setId('done')
  }

  useEffect(() => {
    if (id === 'done' && ready) {
      const t = window.setTimeout(() => router.push(brand ? '/brand' : '/dashboard'), 1600)
      return () => window.clearTimeout(t)
    }
  }, [id, ready, brand, router])

  // The control under the line: only shown once the line has finished typing.
  const textStep = (['email', 'password', 'code', 'paypal', 'name', 'handle', 'bio'] as Id[]).includes(id)
  const placeholder: Partial<Record<Id, string>> = { email: 'you@example.com', password: 'At least 10 characters', code: '6 digits', paypal: 'you@example.com', name: brand ? 'Your name or brand' : 'Your name', handle: 'username', bio: 'A line or two about you' }

  return (
    <main className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto px-6 py-16 text-center">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Typed text={line} onDone={() => { setReady(true); if (id === 'welcome') afterWelcome(); if (id === 'saving') void 0 }} />

            <div aria-live="polite" className={cn('mt-12 flex flex-col items-center transition-opacity duration-500', ready ? 'opacity-100' : 'pointer-events-none opacity-0')}>
              {id === 'role' && (
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" className={pill} onClick={() => choose('clipper')}>
                    Creator
                  </button>
                  <button type="button" className={pill} onClick={() => choose('brand')}>
                    Brand
                  </button>
                </div>
              )}

              {id === 'method' && (
                <>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" className={pill} disabled={busy} onClick={() => provider('google')}>
                      <BrandIcon name="google" className="size-5" /> Google
                    </button>
                    <button type="button" className={pill} disabled={busy} onClick={() => provider('discord')}>
                      <BrandIcon name="discord" className="size-5" /> Discord
                    </button>
                    <button type="button" className={pill} disabled={busy} onClick={() => go('email')}>
                      Email
                    </button>
                  </div>
                  <p className="mt-8 max-w-sm text-sm leading-relaxed text-mute">
                    By continuing you agree to the{' '}
                    <Link href="/legal/terms" className="underline underline-offset-4 hover:text-paper">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-paper">
                      Privacy Policy
                    </Link>
                    . Already have an account?{' '}
                    <Link href="/login" className="underline underline-offset-4 hover:text-paper">
                      Log in
                    </Link>
                    .
                  </p>
                </>
              )}

              {textStep && (
                <form
                  className="w-full max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void submitText()
                  }}
                >
                  <label htmlFor="ob-input" className="sr-only">
                    {line}
                  </label>
                  <input
                    id="ob-input"
                    key={id}
                    autoFocus
                    value={text}
                    onChange={(e) => (setText(e.target.value), setError(''))}
                    type={id === 'password' ? 'password' : id === 'email' || id === 'paypal' ? 'email' : 'text'}
                    inputMode={id === 'code' ? 'numeric' : undefined}
                    autoComplete={id === 'email' ? 'email' : id === 'password' ? 'new-password' : id === 'code' ? 'one-time-code' : 'off'}
                    maxLength={id === 'code' ? 6 : id === 'handle' ? 20 : id === 'bio' ? 160 : 80}
                    placeholder={placeholder[id]}
                    className="w-full rounded-none border-b border-line-strong bg-transparent pb-3 text-center text-2xl outline-none transition-colors placeholder:text-paper/30 focus:border-paper"
                  />
                  {id === 'handle' && handleState !== 'idle' && (
                    <p className="mt-3 text-sm text-mute" role="status">
                      {handleState === 'checking' ? 'Checking…' : handleState === 'ok' ? 'Available' : handleState === 'taken' ? 'Already taken' : 'Use 3 to 20 letters, numbers or underscores'}
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <button type="submit" disabled={busy || (id !== 'paypal' && id !== 'bio' && !text.trim())} className={primary}>
                      {busy ? 'One moment' : 'Continue'}
                    </button>
                    {(id === 'paypal' || id === 'bio') && (
                      <button type="button" onClick={() => (id === 'paypal' ? go('name') : go('socials'))} className="text-[15px] text-mute underline underline-offset-4 hover:text-paper">
                        {id === 'paypal' ? 'Add it later' : 'Skip'}
                      </button>
                    )}
                    {id === 'code' && (
                      <button type="button" onClick={() => resendEmailCode(data.email).then(() => setError('We sent a new code.')).catch(() => setError('Could not send a new code.'))} className="text-[15px] text-mute underline underline-offset-4 hover:text-paper">
                        Send it again
                      </button>
                    )}
                  </div>
                </form>
              )}

              {(id === 'avatar' || id === 'banner') && (
                <>
                  <input ref={file} type="file" accept="image/*" className="sr-only" aria-label={id === 'avatar' ? 'Choose a profile picture' : 'Choose a banner'} onChange={(e) => void pick(id, e.target.files?.[0])} />
                  {id === 'avatar' && data.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.avatarUrl} alt="Your profile picture" className="mb-8 size-28 rounded-full object-cover" />
                  )}
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" className={primary} disabled={busy} onClick={() => file.current?.click()}>
                      {busy ? 'Uploading' : 'Choose a photo'}
                    </button>
                    <button type="button" className={pill} onClick={() => go(id === 'avatar' ? 'banner' : 'bio')}>
                      Skip
                    </button>
                  </div>
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                </>
              )}

              {id === 'socials' && (
                <form
                  className="w-full max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault()
                    for (const k of ['tiktok', 'youtube', 'instagram'] as const) {
                      const v = data.linked[k].trim()
                      if (v && 'error' in buildLink(k, v)) return setError(`Check your ${k} username.`)
                    }
                    go('theme')
                  }}
                >
                  <div className="grid gap-5">
                    {(brand ? (['website', 'instagram', 'tiktok', 'youtube'] as const) : (['tiktok', 'youtube', 'instagram'] as const)).map((k) => (
                      <label key={k} className="flex items-center gap-4 rounded-none border-b border-line-strong pb-2.5 focus-within:border-paper">
                        <span className="w-24 text-left text-[15px] capitalize text-mute">{k}</span>
                        <input value={data.linked[k]} onChange={(e) => (patch({ linked: { ...data.linked, [k]: e.target.value } }), setError(''))} placeholder={k === 'website' ? 'https://' : 'username'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-paper/30" />
                      </label>
                    ))}
                  </div>
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-red-500">
                      {error}
                    </p>
                  )}
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <button type="submit" className={primary}>
                      Continue
                    </button>
                  </div>
                </form>
              )}

              {id === 'theme' && (
                <div className="flex flex-wrap justify-center gap-3">
                  {(['light', 'dark'] as const).map((t) => (
                    <button key={t} type="button" aria-pressed={(theme.light ? 'light' : 'dark') === t} onClick={() => theme.set(t)} className={cn(pill, (theme.light ? 'light' : 'dark') === t && 'border-paper bg-paper text-ink hover:bg-paper')}>
                      {t === 'light' ? 'Light' : 'Dark'}
                    </button>
                  ))}
                </div>
              )}

              {id === 'done' && (
                <Link href={brand ? '/brand' : '/dashboard'} className={primary}>
                  Go to your dashboard
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {id === 'theme' && ready && (
          <div className="mt-10 flex justify-center">
            <button type="button" onClick={() => void save()} className={primary}>
              Finish
            </button>
          </div>
        )}
        {error && id !== 'socials' && !textStep && id !== 'avatar' && id !== 'banner' && (
          <p role="alert" className="mt-6 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      {canBack && id !== 'saving' && id !== 'done' && (
        <button type="button" onClick={back} className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[15px] text-mute transition-colors hover:text-paper">
          Back
        </button>
      )}
    </main>
  )
}
