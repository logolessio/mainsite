'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { Field, Input, PrimaryButton } from '@/components/ui/fields'
import { type Provider, type Role, requestPasswordReset, signInWithEmail, signInWithProvider, signUpWithEmail } from '@/lib/auth'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup' | 'forgot'

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
}

const COPY: Record<Mode, { title: string; sub: string }> = {
  login: { title: 'log in', sub: 'Welcome back.' },
  signup: { title: 'create account', sub: 'Free for clippers. Takes under a minute.' },
  forgot: { title: 'reset password', sub: 'We will email you a link to choose a new one.' },
}

export function AuthCard({ mode }: { mode: Mode }) {
  const params = useSearchParams()
  const { navigate } = useTransitions()
  const [role, setRole] = useState<Role>(params.get('role') === 'brand' ? 'brand' : 'clipper')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState(params.get('error') ? 'Sign-in did not complete. Please try again.' : '')
  const [sent, setSent] = useState(false)

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true)
    setError('')
    try {
      const to = await fn()
      if (to) navigate(to)
      else setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const provider = (p: Provider) => run(() => signInWithProvider(p, mode === 'signup' ? role : undefined))

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email'))
    const password = String(f.get('password') ?? '')
    if (mode === 'login') run(() => signInWithEmail(email, password))
    if (mode === 'signup') {
      if (password.length < 8) return setError('Use at least 8 characters for your password.')
      run(() => signUpWithEmail({ email, password, name: String(f.get('name')), role }))
    }
    if (mode === 'forgot') run(async () => void (await requestPasswordReset(email)))
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
      className="w-full max-w-[440px] border border-line bg-surface/80 p-7 md:p-9 rounded-2xl"
    >
      <motion.h1 variants={item} className="font-display text-5xl leading-none">
        {COPY[mode].title}
      </motion.h1>
      <motion.p variants={item} className="mt-3 text-sm text-mute">
        {COPY[mode].sub}
      </motion.p>

      {mode === 'forgot' && sent ? (
        <p role="status" className="mt-8 border border-line p-5 text-sm leading-relaxed text-mute rounded-2xl">
          If an account exists for that address, a reset link is on its way. Check your inbox and spam folder.
        </p>
      ) : (
        <>
          {mode === 'signup' && (
            <motion.fieldset variants={item} className="mt-7">
              <legend className="font-mono text-xs text-mute">I am a</legend>
              <div className="mt-2 grid grid-cols-2 gap-px bg-line rounded-3xl overflow-hidden">
                {(['clipper', 'brand'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={role === r}
                    onClick={() => setRole(r)}
                    className={cn(
                      'h-12 text-sm transition-colors',
                      role === r ? 'bg-paper text-ink' : 'bg-ink text-mute hover:text-paper',
                    )}
                  >
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
                <Input required name="name" autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <Input required type="email" name="email" autoComplete="email" placeholder="you@example.com" />
            </Field>
            {mode !== 'forgot' && (
              <Field label="Password">
                <span className="relative block">
                  <Input
                    required
                    name="password"
                    type={show ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-mute hover:text-paper"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
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
                  <TransitionLink href="/legal/terms" className="text-paper underline underline-offset-2">
                    Terms
                  </TransitionLink>
                  ,{' '}
                  <TransitionLink
                    href={role === 'brand' ? '/legal/brand-terms' : '/legal/clipper-terms'}
                    className="text-paper underline underline-offset-2"
                  >
                    {role === 'brand' ? 'Brand Terms' : 'Clipper Terms'}
                  </TransitionLink>{' '}
                  and{' '}
                  <TransitionLink href="/legal/privacy" className="text-paper underline underline-offset-2">
                    Privacy Policy
                  </TransitionLink>
                  .
                </span>
              </label>
            )}
            <PrimaryButton type="submit" disabled={busy}>
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </PrimaryButton>
          </motion.form>
        </>
      )}

      <p role="alert" className="mt-4 min-h-5 text-xs text-signal">
        {error}
      </p>

      <motion.p variants={item} className="mt-2 text-sm text-mute">
        {mode === 'login' && (
          <>
            New here?{' '}
            <TransitionLink href="/onboarding" className="text-paper underline underline-offset-4">
              Create an account
            </TransitionLink>
          </>
        )}
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <TransitionLink href="/login" className="text-paper underline underline-offset-4">
              Log in
            </TransitionLink>
          </>
        )}
        {mode === 'forgot' && (
          <TransitionLink href="/login" className="text-paper underline underline-offset-4">
            Back to log in
          </TransitionLink>
        )}
      </motion.p>
    </motion.div>
  )
}

function ProviderButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      variants={item}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0, scale: 0.99 }}
      disabled={disabled}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-3 border border-line-strong bg-ink/40 text-sm transition-colors hover:border-paper/40 hover:bg-paper/5 disabled:opacity-50 rounded-full"
    >
      {children}
    </motion.button>
  )
}
