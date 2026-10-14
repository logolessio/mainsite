'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { Field, Input, PrimaryButton } from '@/components/ui/fields'
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
} from '@/lib/auth'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup' | 'forgot'

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
}

const COPY: Record<Mode, { title: string; sub: string }> = {
  login: { title: 'log in', sub: 'Welcome back.' },
  signup: { title: 'create account', sub: 'Free for clippers. It takes about a minute.' },
  forgot: { title: 'reset password', sub: "We'll email you a code so you can choose a new one." },
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
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState(
    params.get('restricted')
      ? 'This account has been restricted. Contact support if you think that is a mistake.'
      : params.get('error') === 'AccessDenied'
        ? 'That account’s email is not verified. Verify it with Discord or Google, then try again.'
        : params.get('error')
          ? 'Sign-in did not complete. Please try again.'
          : '',
  )

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // ?next=/some-page sends the person back there afterwards (only paths on this site are accepted).
  const nextRaw = params.get('next')
  const next = nextRaw && (/^\/(?!\/)[A-Za-z0-9\-_/?=&.%]*$/.test(nextRaw) || /^https:\/\/(admin|dev)\.logoless\.io(\/[A-Za-z0-9\-_/?=&.%]*)?$/.test(nextRaw)) ? nextRaw : null
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

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const addr = email.trim()
      if (mode === 'login') {
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

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
      className="w-full max-w-[440px] rounded-2xl border border-line bg-surface/80 p-7 md:p-9"
    >
      <motion.h1 variants={item} className="font-display text-5xl leading-none">
        {verifying ? 'check your inbox' : COPY[mode].title}
      </motion.h1>
      <motion.p variants={item} className="mt-3 text-sm text-mute">
        {verifying ? (
          <>
            We sent a 6-digit code to <span className="text-paper">{email}</span>.
          </>
        ) : (
          COPY[mode].sub
        )}
      </motion.p>

      <AnimatePresence mode="wait" initial={false}>
        {!verifying ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {mode === 'signup' && (
              <motion.fieldset variants={item} className="mt-7">
                <legend className="font-mono text-xs text-mute">I am a</legend>
                <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-line">
                  {(['clipper', 'brand'] as Role[]).map((r) => (
                    <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={cn('h-12 text-sm transition-colors', role === r ? 'bg-paper text-ink' : 'bg-ink text-mute hover:text-paper')}>
                      {r === 'clipper' ? 'Clipper' : 'Brand / creator'}
                    </button>
                  ))}
                </div>
              </motion.fieldset>
            )}

            {mode !== 'forgot' && (
              <>
                <div className="mt-6 grid gap-2">
                  <ProviderButton disabled={busy} onClick={() => provider('discord')}>
                    <BrandIcon name="discord" className="size-4" />
                    Continue with Discord
                  </ProviderButton>
                  <ProviderButton disabled={busy} onClick={() => provider('google')}>
                    <BrandIcon name="google" className="size-4" />
                    Continue with Google
                  </ProviderButton>
                </div>
                <motion.div variants={item} className="my-6 flex items-center gap-3 text-xs text-mute">
                  <span className="h-px flex-1 bg-line" />
                  or with email
                  <span className="h-px flex-1 bg-line" />
                </motion.div>
              </>
            )}

            <motion.form variants={item} onSubmit={submit} className={cn('grid gap-4', mode === 'forgot' && 'mt-7')}>
              {mode === 'signup' && (
                <Field label="Name">
                  <Input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                </Field>
              )}
              <Field label="Email">
                <Input required type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              {mode !== 'forgot' && (
                <Field label="Password" hint={mode === 'signup' ? 'At least 10 characters. We check it has not been in a data breach.' : undefined}>
                  <span className="relative block">
                    <Input
                      required
                      name="password"
                      type={show ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={mode === 'signup' ? 10 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12"
                    />
                    <ShowToggle show={show} onClick={() => setShow((v) => !v)} />
                  </span>
                  {mode === 'signup' && password && <Meter level={pw} />}
                </Field>
              )}
              {mode === 'login' && (
                <TransitionLink href="/forgot-password" className="-mt-1 self-start text-xs text-mute underline underline-offset-4 hover:text-paper">
                  Forgot your password?
                </TransitionLink>
              )}
              {mode === 'signup' && (
                <label className="flex items-start gap-3 text-xs leading-relaxed text-mute">
                  <input required type="checkbox" name="terms" className="mt-0.5 size-4 accent-[#f3f2ee]" />
                  <span>
                    I agree to the{' '}
                    <TransitionLink href="/legal/terms" className="text-paper underline underline-offset-2">Terms</TransitionLink>,{' '}
                    <TransitionLink href={role === 'brand' ? '/legal/brand-terms' : '/legal/clipper-terms'} className="text-paper underline underline-offset-2">
                      {role === 'brand' ? 'Brand Terms' : 'Clipper Terms'}
                    </TransitionLink>{' '}
                    and{' '}
                    <TransitionLink href="/legal/privacy" className="text-paper underline underline-offset-2">Privacy Policy</TransitionLink>.
                  </span>
                </label>
              )}
              <PrimaryButton type="submit" disabled={busy}>
                {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send me a code'}
              </PrimaryButton>
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
            className="mt-7 text-center"
          >
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-line-strong">
              <MailCheck className="size-6" />
            </span>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(v)
                if (mode === 'signup' && v.length === 6 && !busy) finish(v)
              }}
              aria-label="6-digit code"
              placeholder="000000"
              className="mx-auto mt-6 block h-14 w-56 rounded-full border border-line-strong bg-ink/60 text-center font-mono text-2xl tracking-[0.5em] placeholder:text-mute/50 focus:border-paper/60 focus:outline-none"
            />
            {mode === 'forgot' && (
              <div className="mt-5 text-left">
                <Field label="New password" hint="At least 10 characters.">
                  <span className="relative block">
                    <Input required name="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" />
                    <ShowToggle show={show} onClick={() => setShow((v) => !v)} />
                  </span>
                  {password && <Meter level={pw} />}
                </Field>
              </div>
            )}
            <PrimaryButton type="submit" disabled={busy || code.length !== 6 || (mode === 'forgot' && password.length < 10)} className="mt-5 w-full">
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {mode === 'signup' ? 'Confirm and create account' : 'Set password and log in'}
            </PrimaryButton>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-mute">
              <button type="button" onClick={() => { setStep('form'); setError('') }} className="underline underline-offset-4 hover:text-paper">
                Use a different email
              </button>
              <button type="button" disabled={cooldown > 0 || busy} onClick={resend} className="underline underline-offset-4 hover:text-paper disabled:no-underline disabled:opacity-60">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <p role="alert" className="mt-4 min-h-5 text-xs text-signal">
        {error}
      </p>

      <motion.p variants={item} className="mt-2 text-sm text-mute">
        {mode === 'login' && (
          <>
            New here?{' '}
            <TransitionLink href="/onboarding" className="text-paper underline underline-offset-4">Create an account</TransitionLink>
          </>
        )}
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <TransitionLink href="/login" className="text-paper underline underline-offset-4">Log in</TransitionLink>
          </>
        )}
        {mode === 'forgot' && (
          <TransitionLink href="/login" className="text-paper underline underline-offset-4">Back to log in</TransitionLink>
        )}
      </motion.p>
    </motion.div>
  )
}

function ShowToggle({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={onClick} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-mute hover:text-paper">
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}

function Meter({ level }: { level: number }) {
  const labels = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong']
  return (
    <span className="mt-2 flex items-center gap-2" aria-live="polite">
      <span className="grid flex-1 grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 rounded-full transition-colors', i < level ? (level >= 3 ? 'bg-emerald-300' : level === 2 ? 'bg-amber-300' : 'bg-signal') : 'bg-line-strong')} />
        ))}
      </span>
      <span className="w-14 text-right text-[11px] text-mute">{labels[level]}</span>
    </span>
  )
}

function ProviderButton({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line-strong text-sm transition-colors hover:border-paper/40 hover:bg-paper/5 disabled:opacity-50">
      {children}
    </button>
  )
}
