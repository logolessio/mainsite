'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FingerprintPattern, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { useFeature } from '@/components/shell/features-provider'
import { useTransitions } from '@/components/shell/transition-provider'
import { OtpInput } from './email-ui'
import {
  type Provider,
  type Role,
  confirmSignup,
  requestPasswordReset,
  resendSignupCode,
  resetPassword,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  needsTwoStep,
} from '@/lib/auth'
import { EASE_OUT } from '@/lib/layout'
import { passkeysSupported, PasskeyCancelled, signInWithPasskey } from '@/lib/passkey-client'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup' | 'forgot'

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
}

const COPY: Record<Mode, { title: string; sub: string }> = {
  login: { title: 'Log in', sub: 'Welcome back.' },
  signup: { title: 'Create your account', sub: 'Free for creators. It takes about a minute.' },
  forgot: { title: 'Reset your password', sub: "We'll email you a code so you can choose a new one." },
}

/** How strong a password looks, from length and variety. Only a hint: the server enforces the real rules. */
function strength(p: string) {
  let s = 0
  if (p.length >= 10) s++
  if (p.length >= 14) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return Math.min(4, s)
}

export function AuthCard({ mode }: { mode: Mode }) {
  const params = useSearchParams()
  const { navigate } = useTransitions()
  const [role, setRole] = useState<Role>(params.get('role') === 'brand' ? 'brand' : 'clipper')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [show, setShow] = useState(false)
  const [step, setStep] = useState<'form' | 'code' | 'two'>('form')
  const [second, setSecond] = useState('')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const passkeysOn = useFeature('passkeys')
  const [canPasskey, setCanPasskey] = useState(false)
  useEffect(() => setCanPasskey(passkeysSupported()), [])
  const [error, setError] = useState(
    params.get('restricted')
      ? 'This account has been restricted. Contact support if you think that is a mistake.'
      : params.get('error') === 'AccessDenied'
        ? 'That account’s email is not verified. Verify it with Discord or Google, then try again.'
        : params.get('error')
          ? `Sign-in did not complete. Please try again. (reference: ${params.get('error')!.replace(/[^A-Za-z]/g, '').slice(0, 40)})`
          : '',
  )

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // ?next=/some-page sends the person back there afterwards (only paths on this site are accepted).
  const nextRaw = params.get('next')
  const next = nextRaw && (/^\/(?!\/)[A-Za-z0-9\-_/?=&.%]*$/.test(nextRaw) || /^https:\/\/(owner|admin|dev)\.logoless\.io(\/[A-Za-z0-9\-_/?=&.%]*)?$/.test(nextRaw)) ? nextRaw : null
  const done = () => (next?.startsWith('https://') ? window.location.assign(next) : navigate(next ?? (role === 'brand' && mode === 'signup' ? '/brand' : '/dashboard')))
  const fail = (e: unknown, fallback = 'Something went wrong. Please try again.') => setError(e instanceof Error ? e.message : fallback)

  const provider = async (p: Provider) => {
    setBusy(true)
    setError('')
    try {
      await signInWithProvider(p, mode === 'signup' ? role : undefined, next ?? undefined)
    } catch (e) {
      fail(e)
      setBusy(false)
    }
  }

  const withPasskey = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithPasskey()
      done()
    } catch (e) {
      if (!(e instanceof PasskeyCancelled)) fail(e)
      setBusy(false)
    }
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const addr = email.trim()
      if (mode === 'login') {
        // a person with two-step sign-in on is asked for the code before anything else happens
        if (await needsTwoStep(addr, password)) {
          setStep('two')
          setSecond('')
          return
        }
        await signInWithEmail(addr, password)
        done()
        return
      }
      if (mode === 'signup') {
        if (password.length < 10) throw new Error('Use at least 10 characters for your password.')
        await signUpWithEmail({ email: addr, password, name: name.trim() })
      } else {
        await requestPasswordReset(addr)
      }
      setStep('code')
      setCode('')
      setCooldown(30)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const finishTwoStep = async () => {
    if (!second.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await signInWithEmail(email.trim(), password, second)
      done()
    } catch (err) {
      fail(err, 'That code did not work.')
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    try {
      if (mode === 'signup') await resendSignupCode(email.trim())
      else await requestPasswordReset(email.trim())
      setCooldown(30)
    } catch (err) {
      fail(err, 'Could not send the code.')
    }
  }

  const finish = async (value: string) => {
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') {
        await confirmSignup(email.trim(), value)
      } else {
        if (password.length < 10) throw new Error('Choose a new password of at least 10 characters.')
        await resetPassword(email.trim(), value, password)
        await signInWithEmail(email.trim(), password)
      }
      done()
    } catch (err) {
      fail(err, 'That did not work. Please try again.')
      setBusy(false)
    }
  }

  const pw = strength(password)
  const verifying = step === 'code'
  const twoStep = step === 'two'
  const field = 'h-12 w-full rounded-tile border border-line-strong bg-transparent px-4 text-[16px] text-paper outline-none transition-colors placeholder:text-mute/50 focus:border-paper/60 disabled:opacity-50'
  const label = 'mb-1.5 block text-sm text-mute'

  return (
    <motion.div initial={false} animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }} className="w-full max-w-[380px]">
      <motion.h1 variants={item} className="font-display text-[2.6rem] leading-[1.05]">
        {twoStep ? 'One more step' : verifying ? 'Check your inbox' : COPY[mode].title}
      </motion.h1>
      <motion.p variants={item} className="mt-3 text-[15px] leading-relaxed text-mute">
        {twoStep ? (
          'Open your authenticator app and enter the 6 digit code for logoless. Lost your phone? Use one of your backup codes.'
        ) : verifying ? (
          <>
            We sent a 6 digit code to <span className="text-paper">{email}</span>.
          </>
        ) : (
          COPY[mode].sub
        )}
      </motion.p>

      <AnimatePresence mode="wait" initial={false}>
        {twoStep ? (
          <motion.form key="two" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }} onSubmit={(e) => (e.preventDefault(), void finishTwoStep())} className="mt-8">
            <label htmlFor="auth-second" className="sr-only">
              Code from your authenticator app, or a backup code
            </label>
            <input id="auth-second" autoFocus value={second} onChange={(e) => (setSecond(e.target.value), setError(''))} inputMode="text" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} placeholder="123456" className="h-14 w-full rounded-tile border border-line-strong bg-transparent px-4 text-center font-mono text-2xl tracking-[0.3em] text-paper outline-none transition-colors placeholder:text-mute/40 focus:border-paper/60" />
            {error && (
              <p role="alert" className="mt-3 text-sm text-signal">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy || !second.trim()} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Log in
            </button>
            <button type="button" onClick={() => (setStep('form'), setSecond(''), setError(''))} className="mt-4 text-sm text-mute transition-colors hover:text-paper">
              Back
            </button>
          </motion.form>
        ) : !verifying ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {mode === 'signup' && (
              <motion.fieldset variants={item} className="mt-7">
                <legend className={label}>I am a</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['clipper', 'brand'] as Role[]).map((r) => (
                    <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={cn('h-12 rounded-tile border text-sm transition-colors', role === r ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                      {r === 'clipper' ? 'Creator' : 'Brand'}
                    </button>
                  ))}
                </div>
              </motion.fieldset>
            )}

            {mode !== 'forgot' && (
              <>
                <div className="mt-8 grid gap-2.5">
                  <ProviderButton disabled={busy} onClick={() => provider('google')}>
                    <BrandIcon name="google" className="size-[18px]" />
                    Continue with Google
                  </ProviderButton>
                  <ProviderButton disabled={busy} onClick={() => provider('discord')}>
                    <BrandIcon name="discord" className="size-[18px]" />
                    Continue with Discord
                  </ProviderButton>
                  {mode === 'login' && passkeysOn && canPasskey && (
                    <ProviderButton disabled={busy} onClick={() => void withPasskey()}>
                      <FingerprintPattern aria-hidden="true" className="size-[18px]" />
                      Log in with a passkey
                    </ProviderButton>
                  )}
                </div>
                <motion.div variants={item} className="my-7 flex items-center gap-4 text-sm text-mute">
                  <span className="h-px flex-1 bg-line" />
                  or
                  <span className="h-px flex-1 bg-line" />
                </motion.div>
              </>
            )}

            <motion.form variants={item} onSubmit={submit} className={cn('grid gap-5', mode === 'forgot' && 'mt-8')}>
              {mode === 'signup' && (
                <label className="block">
                  <span className={label}>Name</span>
                  <input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={field} />
                </label>
              )}
              <label className="block">
                <span className={label}>Email</span>
                <input required type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              </label>
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="auth-password" className="mb-1.5 block text-sm text-mute">
                      Password
                    </label>
                    {mode === 'login' && (
                      <a href="/forgot-password" className="text-sm text-mute transition-colors hover:text-paper">
                        Forgot it?
                      </a>
                    )}
                  </div>
                  <span className="relative block">
                    <input
                      id="auth-password"
                      required
                      name="password"
                      type={show ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={mode === 'signup' ? 10 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(field, 'pr-16')}
                    />
                    <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 px-4 text-sm text-mute transition-colors hover:text-paper">
                      {show ? 'Hide' : 'Show'}
                    </button>
                  </span>
                  {mode === 'signup' && <p className="mt-2 text-sm text-mute">At least 10 characters. We check it has not been in a data breach.</p>}
                  {mode === 'signup' && password && <Meter level={pw} />}
                </div>
              )}
              {mode === 'signup' && (
                <label className="flex items-start gap-3 text-sm leading-relaxed text-mute">
                  <input required type="checkbox" name="terms" className="mt-1 size-4 accent-[#f3f2ee]" />
                  <span>
                    I agree to the{' '}
                    <a href="/legal/terms" className="text-paper underline underline-offset-2">Terms</a>,{' '}
                    <a href={role === 'brand' ? '/legal/brand-terms' : '/legal/clipper-terms'} className="text-paper underline underline-offset-2">
                      {role === 'brand' ? 'Brand Terms' : 'Creator Terms'}
                    </a>{' '}
                    and{' '}
                    <a href="/legal/privacy" className="text-paper underline underline-offset-2">Privacy Policy</a>, and I am 16 or older.
                  </span>
                </label>
              )}
              <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-50">
                {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send me a code'}
              </button>
            </motion.form>
          </motion.div>
        ) : (
          <motion.form
            key="code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            onSubmit={(e) => {
              e.preventDefault()
              if (code.length === 6) finish(code)
            }}
            className="mt-8"
          >
            <OtpInput
              disabled={busy}
              value={code}
              onChange={(v) => {
                setCode(v)
                if (mode === 'signup' && v.length === 6 && !busy) finish(v)
              }}
            />
            {mode === 'forgot' && (
              <div className="mt-6">
                <label htmlFor="auth-new-password" className={label}>
                  New password
                </label>
                <span className="relative block">
                  <input id="auth-new-password" required name="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className={cn(field, 'pr-16')} />
                  <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 px-4 text-sm text-mute transition-colors hover:text-paper">
                    {show ? 'Hide' : 'Show'}
                  </button>
                </span>
                <p className="mt-2 text-sm text-mute">At least 10 characters.</p>
                {password && <Meter level={pw} />}
              </div>
            )}
            <button type="submit" disabled={busy || code.length !== 6 || (mode === 'forgot' && password.length < 10)} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {mode === 'signup' ? 'Confirm and create account' : 'Set password and log in'}
            </button>
            <div className="mt-4 flex items-center justify-center gap-5 text-sm text-mute">
              <button
                type="button"
                onClick={() => {
                  setStep('form')
                  setError('')
                }}
                className="transition-colors hover:text-paper"
              >
                Use a different email
              </button>
              <button type="button" disabled={cooldown > 0 || busy} onClick={resend} className="transition-colors hover:text-paper disabled:opacity-60 disabled:hover:text-mute">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <p role="alert" className="mt-4 min-h-5 text-sm text-signal">
        {error}
      </p>

      <motion.div variants={item} className="mt-6 border-t border-line pt-7">
        {mode === 'login' && (
          <>
            <p className="mb-3 text-[15px] text-mute">New to logoless?</p>
            <a href="/onboarding" className="inline-flex h-12 w-full items-center justify-center rounded-pill border border-line-strong text-[15px] text-paper transition-colors hover:border-paper/50 hover:bg-white/[0.04]">
              Create an account
            </a>
          </>
        )}
        {mode === 'signup' && (
          <p className="text-[15px] text-mute">
            Already have an account?{' '}
            <a href="/login" className="text-paper underline underline-offset-4">Log in</a>
          </p>
        )}
        {mode === 'forgot' && (
          <a href="/login" className="text-[15px] text-paper underline underline-offset-4">Back to log in</a>
        )}
      </motion.div>
    </motion.div>
  )
}

function Meter({ level }: { level: number }) {
  const labels = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong']
  return (
    <span className="mt-2 flex items-center gap-2" aria-live="polite">
      <span className="grid flex-1 grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 rounded-pill transition-colors', i < level ? 'bg-paper' : 'bg-line-strong')} />
        ))}
      </span>
      <span className="w-14 text-right text-xs text-mute">{labels[level]}</span>
    </span>
  )
}

function ProviderButton({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className="flex h-12 w-full items-center justify-center gap-3 rounded-pill border border-line-strong text-[15px] transition-colors hover:border-paper/50 hover:bg-white/[0.04] disabled:opacity-50">
      {children}
    </button>
  )
}
