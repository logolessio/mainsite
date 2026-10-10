'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Logo } from '@/components/logo'
import { TransitionLink } from '@/components/shell/transition-link'
import { useMounted } from '@/hooks/use-motion-prefs'
import { EASE_OUT } from '@/lib/layout'
import { DEFAULT_DATA, type OnboardingData } from '@/lib/onboarding'
import { getConnectStatus, getFinance } from '@/lib/stripe-client'
import { cn } from '@/lib/utils'
import { AccountStep } from './steps/account-step'
import { BillingStep } from './steps/billing-step'
import { BrandStep } from './steps/brand-step'
import { DoneStep } from './steps/done-step'
import { GoalsStep } from './steps/goals-step'
import { InterestsStep } from './steps/interests-step'
import { PayoutsStep } from './steps/payouts-step'
import { ProfileStep, profileValid } from './steps/profile-step'
import { SocialsStep } from './steps/socials-step'
import type { StepProps } from './types'
import { GhostBtn, PrimaryBtn } from './ui'

type StepDef = {
  id: string
  label: string
  Component: React.ComponentType<StepProps>
  valid: (d: OnboardingData) => boolean
  optional?: boolean
  /** Hide the Back / Continue bar (the step moves on by itself). */
  bare?: boolean
  cta?: (d: OnboardingData) => string
}

const ACCOUNT: StepDef = { id: 'account', label: 'Account', Component: AccountStep, valid: (d) => d.accountCreated, bare: true }

const CLIPPER: StepDef[] = [
  ACCOUNT,
  { id: 'profile', label: 'Profile', Component: ProfileStep, valid: (d) => profileValid(d) },
  {
    id: 'socials',
    label: 'Socials',
    Component: SocialsStep,
    valid: () => true,
    optional: true,
    cta: (d) => (Object.keys(d.linked).length ? 'Continue' : 'Skip for now'),
  },
  { id: 'interests', label: 'Interests', Component: InterestsStep, valid: (d) => d.niches.length > 0 },
  {
    id: 'payouts',
    label: 'Payouts',
    Component: PayoutsStep,
    valid: () => true,
    optional: true,
    cta: (d) => (d.stripeConnected ? 'Continue' : 'Do this later'),
  },
  { id: 'done', label: 'Ready', Component: DoneStep, valid: () => true, bare: true },
]

const BRAND: StepDef[] = [
  ACCOUNT,
  { id: 'brand', label: 'Brand', Component: BrandStep, valid: (d) => d.company.trim().length > 1 && d.industry !== '' },
  { id: 'goals', label: 'Goals', Component: GoalsStep, valid: (d) => d.goals.length > 0 },
  {
    id: 'billing',
    label: 'How it works',
    Component: BillingStep,
    valid: () => true,
    cta: () => 'Continue',
  },
  { id: 'done', label: 'Ready', Component: DoneStep, valid: () => true, bare: true },
]

const KEY = 'logoless:onboarding:v1'

export function OnboardingFlow({ initialRole, sessionUser }: { initialRole?: 'clipper' | 'brand'; sessionUser?: { name: string; email: string } | null }) {
  const mounted = useMounted()
  const [data, setData] = useState<OnboardingData>({ ...DEFAULT_DATA, role: initialRole ?? 'clipper' })
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [restored, setRestored] = useState(false)
  const [finished, setFinished] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  const steps = data.role === 'brand' ? BRAND : CLIPPER
  const step = steps[Math.min(index, steps.length - 1)]
  const last = index === steps.length - 1

  // resume where the person left off (never stores passwords or local image previews)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { data: Partial<OnboardingData>; index: number }
        if (!saved.data?.accountCreated || saved.index === 0) throw new Error('nothing to resume')
        setData((d) => ({ ...d, ...saved.data, avatar: null, logo: null, role: initialRole ?? saved.data.role ?? d.role }))
        setIndex(saved.index)
      }
    } catch {
      /* start fresh */
    }
    // coming back from Google or Discord already signed in: skip the account step
    if (sessionUser) {
      setData((d) => ({
        ...d,
        accountCreated: true,
        terms: true,
        method: d.method ?? 'google',
        email: d.email || sessionUser.email,
        name: d.name || sessionUser.name,
      }))
      setIndex((i) => (i === 0 ? 1 : i))
    }
    setRestored(true)
  }, [initialRole, sessionUser])

  useEffect(() => {
    if (!restored) return
    try {
      if (finished) return localStorage.removeItem(KEY)
      const { avatar: _a, logo: _l, ...persist } = data
      localStorage.setItem(KEY, JSON.stringify({ data: persist, index }))
    } catch {
      /* private mode */
    }
  }, [data, index, restored, finished])

  // Back from Stripe (?stripe=return after onboarding, ?topup=success after paying): confirm with the server.
  useEffect(() => {
    if (!restored) return
    const q = new URLSearchParams(window.location.search)
    const connectBack = q.get('stripe') === 'return'
    const paidBack = q.get('topup') === 'success'
    if (!connectBack && !paidBack) return
    window.history.replaceState(null, '', `/onboarding?role=${q.get('role') ?? data.role}`)
    let live = true
    ;(async () => {
      if (connectBack) {
        const r = await getConnectStatus().catch(() => null)
        if (live && r?.status === 'ready') setData((d) => ({ ...d, stripeConnected: true }))
      }
      if (paidBack) {
        // the payment confirmation reaches us a moment after the redirect, so look a few times
        for (let i = 0; i < 10 && live; i++) {
          const f = await getFinance().catch(() => null)
          if (f && f.balances.brand > 0) {
            setData((d) => ({ ...d, stripeConnected: true }))
            break
          }
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored])

  const update = useCallback((patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch })), [])
  const go = useCallback((to: number) => {
    setDir(to > index ? 1 : -1)
    setIndex(to)
    scroller.current?.scrollTo({ top: 0 })
  }, [index])
  const next = useCallback(() => go(Math.min(index + 1, steps.length - 1)), [go, index, steps.length])
  const back = () => go(Math.max(0, index - 1))

  // Enter advances when the current step is valid and the focus is not in a text area or a button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      if (e.key !== 'Enter' || step.bare || !step.valid(data)) return
      if (el && ['TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(el.tagName)) return
      next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, data, next])

  const Body = step.Component

  if (!mounted || !restored) return <div className="min-h-dvh" />

  const progress = (index + (last ? 1 : 0.5)) / steps.length

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 md:px-6">
        <TransitionLink href="/" aria-label="logoless home">
          <Logo className="h-9 md:h-11" />
        </TransitionLink>
        <p className="text-sm text-mute">
          Have an account?{' '}
          <TransitionLink href="/login" className="text-paper underline underline-offset-4">
            Log in
          </TransitionLink>
        </p>
      </header>

      {/* progress */}
      <nav aria-label="Progress" className="mx-auto mt-2 w-full max-w-[640px] px-5">
        <ol className="hidden items-center justify-between md:flex">
          {steps.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center last:flex-none">
              <span className="flex items-center gap-2">
                <span
                  aria-current={i === index ? 'step' : undefined}
                  className={cn(
                    'grid size-7 place-items-center rounded-full border font-mono text-[11px] transition-colors',
                    i < index ? 'border-paper bg-paper text-ink' : i === index ? 'border-paper text-paper' : 'border-line-strong text-mute',
                  )}
                >
                  {i < index ? '✓' : i + 1}
                </span>
                <span className={cn('text-xs transition-colors', i === index ? 'text-paper' : 'text-mute')}>{s.label}</span>
              </span>
              {i < steps.length - 1 && <span className={cn('mx-3 h-px flex-1 transition-colors', i < index ? 'bg-paper/60' : 'bg-line')} />}
            </li>
          ))}
        </ol>
        <div className="md:hidden">
          <p className="mb-2 text-center font-mono text-[11px] tracking-widest text-mute uppercase">
            Step {index + 1} of {steps.length} · {step.label}
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <motion.div className="h-full rounded-full bg-paper" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5, ease: EASE_OUT }} />
          </div>
        </div>
      </nav>

      <main ref={scroller} className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 md:items-center md:pt-4">
        <div className="w-full max-w-[560px] rounded-[36px] border border-white/[0.14] bg-gradient-to-b from-[#17171b] to-[#0a0a0c] p-6 shadow-[0_50px_90px_-40px_rgb(0_0_0/0.95),inset_0_1px_0_rgb(255_255_255/0.16)] md:p-9">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -36 }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
            >
              <Body data={data} update={update} next={next} onFinish={() => setFinished(true)} />
            </motion.div>
          </AnimatePresence>

          {!step.bare && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <GhostBtn type="button" onClick={back} aria-label="Back">
                <ArrowLeft className="size-4" />
                Back
              </GhostBtn>
              <PrimaryBtn type="button" onClick={next} disabled={!step.valid(data)}>
                {step.cta ? step.cta(data) : 'Continue'}
                <ArrowRight className="size-4" />
              </PrimaryBtn>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
