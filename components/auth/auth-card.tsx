'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MailCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { Field, Input, PrimaryButton } from '@/components/ui/fields'
import { type Provider, type Role, sendEmailCode, signInWithCode, signInWithProvider } from '@/lib/auth'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup'

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
}

const COPY: Record<Mode, { title: string; sub: string }> = {
  login: { title: 'log in', sub: 'Welcome back.' },
  signup: { title: 'create account', sub: 'Free for clippers. Takes under a minute.' },
}

export function AuthCard({ mode }: { mode: Mode }) {
  const params = useSearchParams()
  const { navigate } = useTransitions()
  const [role, setRole] = useState<Role>(params.get('role') === 'brand' ? 'brand' : 'clipper')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState(
    params.get('error') === 'AccessDenied'
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

  const go = () => navigate(role === 'brand' && mode === 'signup' ? '/brand' : '/dashboard')

  const provider = async (p: Provider) => {
    setBusy(true)
    setError('')
    try {
      await signInWithProvider(p, mode === 'signup' ? role : undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const sendCode = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      await sendEmailCode(email.trim())
      setStep('code')
      setCode('')
      setCooldown(30)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not send the code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (value: string) => {
    setBusy(true)
    setError('')
    try {
      await signInWithCode(email.trim(), value)
      go()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code is not right.')
      setCode('')
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
      className="w-full max-w-[440px] rounded-2xl border border-line bg-surface/80 p-7 md:p-9"
    >
      <motion.h1 variants={item} className="font-display text-5xl leading-none">
        {step === 'code' ? 'check your inbox' : COPY[mode].title}
      </motion.h1>
      <motion.p variants={item} className="mt-3 text-sm text-mute">
        {step === 'code' ? <>We sent a 6-digit code to <span className="text-paper">{email}</span>.</> : COPY[mode].sub}
      </motion.p>

      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' ? (
          <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {mode === 'signup' && (
              <motion.fieldset variants={item} className="mt-7">
                <legend className="font-mono text-xs text-mute">I am a</legend>
                <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-line">
                  {(['clipper', 'brand'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={role === r}
                      onClick={() => setRole(r)}
                      className={cn('h-12 text-sm transition-colors', role === r ? 'bg-paper text-ink' : 'bg-ink text-mute hover:text-paper')}
                    >
                      {r === 'clipper' ? 'Clipper' : 'Brand / creator'}
                    </button>
                  ))}
                </div>
              </motion.fieldset>
            )}

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
              or with an emailed code
              <span className="h-px flex-1 bg-line" />
            </motion.div>

            <motion.form variants={item} onSubmit={sendCode} className="grid gap-4">
              <Field label="Email">
                <Input required type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
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
                Email me a code
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
              if (code.length === 6) verify(code)
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
                if (v.length === 6 && !busy) verify(v)
              }}
              aria-label="6-digit code"
              placeholder="000000"
              className="mx-auto mt-6 block h-14 w-56 rounded-full border border-line-strong bg-ink/60 text-center font-mono text-2xl tracking-[0.5em] placeholder:text-mute/50 focus:border-paper/60 focus:outline-none"
            />
            <PrimaryButton type="submit" disabled={busy || code.length !== 6} className="mt-5 w-full">
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {mode === 'login' ? 'Log in' : 'Create account'}
            </PrimaryButton>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-mute">
              <button type="button" onClick={() => { setStep('email'); setError('') }} className="underline underline-offset-4 hover:text-paper">
                Use a different email
              </button>
              <button type="button" disabled={cooldown > 0 || busy} onClick={() => sendCode()} className="underline underline-offset-4 hover:text-paper disabled:no-underline disabled:opacity-60">
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
        {mode === 'login' ? (
          <>
            New here?{' '}
            <TransitionLink href="/onboarding" className="text-paper underline underline-offset-4">Create an account</TransitionLink>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <TransitionLink href="/login" className="text-paper underline underline-offset-4">Log in</TransitionLink>
          </>
        )}
      </motion.p>
    </motion.div>
  )
}

function ProviderButton({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...p}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line-strong text-sm transition-colors hover:border-paper/40 hover:bg-paper/5 disabled:opacity-50"
    >
      {children}
    </button>
  )
}
