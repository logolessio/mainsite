'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { TransitionLink } from '@/components/shell/transition-link'
import { Field, Input } from '@/components/ui/fields'
import { type Provider, type Role, signInWithProvider, signUpWithEmail } from '@/lib/auth'
import { resendEmailCode, verifyEmailCode } from '@/lib/onboarding'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import type { StepProps } from '../types'
import { GhostBtn, PrimaryBtn, StepTitle } from '../ui'

const ROLES: { key: Role; title: string; body: string }[] = [
  { key: 'clipper', title: 'I want to clip', body: 'Make clips, post them, get paid per view.' },
  { key: 'brand', title: 'I have content to promote', body: 'Artist, streamer or brand running campaigns.' },
]

export function AccountStep({ data, update, next }: StepProps) {
  const [phase, setPhase] = useState<'choose' | 'verify'>('choose')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const needTerms = () => {
    if (data.terms) return false
    setError('Please accept the terms to continue.')
    return true
  }

  const provider = async (p: Provider) => {
    if (needTerms()) return
    setBusy(p)
    setError('')
    try {
      // The browser leaves for Google/Discord and comes back to /onboarding signed in, where the flow picks up at the profile step.
      await signInWithProvider(p, data.role, `/onboarding?role=${data.role}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Please try again.')
      setBusy(null)
    }
  }

  const email = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (needTerms()) return
    const f = new FormData(e.currentTarget)
    const address = String(f.get('email')).trim()
    const password = String(f.get('password'))
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    setBusy('email')
    setError('')
    try {
      await signUpWithEmail({ email: address, password, name: '', role: data.role })
      update({ email: address, method: 'email' })
      setPhase('verify')
      setCooldown(30)
    } catch {
      setError('Could not create your account. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy('code')
    setError('')
    const ok = await verifyEmailCode(data.email, code)
    setBusy(null)
    if (!ok) return setError('That code is not right. Check the 6 digits in your email.')
    update({ accountCreated: true })
    next()
  }

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'choose' ? (
          <motion.div key="choose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
            <StepTitle title="Create your account" sub="Free to join. Takes about two minutes." />

            <div role="radiogroup" aria-label="I am a" className="mt-7 grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={data.role === r.key}
                  onClick={() => update({ role: r.key })}
                  className={cn(
                    'rounded-[22px] border p-4 text-left transition-colors',
                    data.role === r.key ? 'border-paper bg-paper/[0.08]' : 'border-line-strong hover:border-paper/40',
                  )}
                >
                  <span className="block font-medium">{r.title}</span>
                  <span className="mt-1 block text-xs leading-snug text-mute">{r.body}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2">
              {(['discord', 'google'] as Provider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => provider(p)}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line-strong text-sm transition-colors hover:border-paper/40 hover:bg-paper/5 disabled:opacity-50"
                >
                  {busy === p ? <Loader2 className="size-4 animate-spin" /> : <BrandIcon name={p} className="size-4" />}
                  Continue with {p === 'discord' ? 'Discord' : 'Google'}
                </button>
              ))}
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-mute">
              <span className="h-px flex-1 bg-line" />
              or with email
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={email} className="grid gap-3">
              <Field label="Email">
                <Input required type="email" name="email" autoComplete="email" placeholder="you@example.com" defaultValue={data.email} />
              </Field>
              <Field label="Password" hint="At least 8 characters.">
                <span className="relative block">
                  <Input required name="password" type={showPw ? 'text' : 'password'} autoComplete="new-password" minLength={8} className="pr-12" />
                  <button
                    type="button"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-mute hover:text-paper"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </Field>

              <label className="mt-1 flex items-start gap-3 text-xs leading-relaxed text-mute">
                <input
                  type="checkbox"
                  checked={data.terms}
                  onChange={(e) => {
                    update({ terms: e.target.checked })
                    if (e.target.checked) setError('')
                  }}
                  className="mt-0.5 size-4 accent-[#f3f2ee]"
                />
                <span>
                  I agree to the{' '}
                  <TransitionLink href="/legal/terms" className="text-paper underline underline-offset-2">
                    Terms
                  </TransitionLink>
                  ,{' '}
                  <TransitionLink href={data.role === 'brand' ? '/legal/brand-terms' : '/legal/clipper-terms'} className="text-paper underline underline-offset-2">
                    {data.role === 'brand' ? 'Brand Terms' : 'Clipper Terms'}
                  </TransitionLink>{' '}
                  and{' '}
                  <TransitionLink href="/legal/privacy" className="text-paper underline underline-offset-2">
                    Privacy Policy
                  </TransitionLink>
                  .
                </span>
              </label>

              <PrimaryBtn type="submit" disabled={busy !== null} className="mt-1">
                {busy === 'email' && <Loader2 className="size-4 animate-spin" />}
                Create account
              </PrimaryBtn>
            </form>
            <p role="alert" className="mt-3 min-h-5 text-center text-xs text-signal">
              {error}
            </p>
          </motion.div>
        ) : (
          <motion.form key="verify" onSubmit={confirm} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE_OUT }} className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-line-strong">
              <MailCheck className="size-6" />
            </span>
            <div className="mt-5">
              <StepTitle title="Check your inbox" sub={`We sent a 6-digit code to ${data.email}.`} />
            </div>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              aria-label="6-digit code"
              placeholder="000000"
              className="mx-auto mt-6 block h-14 w-56 rounded-full border border-line-strong bg-ink/60 text-center font-mono text-2xl tracking-[0.5em] placeholder:text-mute/50 focus:border-paper/60 focus:outline-none"
            />
            <p role="alert" className="mt-3 min-h-5 text-xs text-signal">
              {error}
            </p>
            <div className="mt-2 flex justify-center gap-2">
              <GhostBtn type="button" onClick={() => setPhase('choose')}>
                Change email
              </GhostBtn>
              <PrimaryBtn type="submit" disabled={code.length !== 6 || busy !== null}>
                {busy === 'code' && <Loader2 className="size-4 animate-spin" />}
                Verify
              </PrimaryBtn>
            </div>
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={async () => {
                await resendEmailCode(data.email)
                setCooldown(30)
              }}
              className="mt-5 text-xs text-mute underline underline-offset-4 hover:text-paper disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
