'use client'

import { motion } from 'framer-motion'
import { Check, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTransitions } from '@/components/shell/transition-provider'
import { completeOnboarding } from '@/lib/onboarding'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import type { StepProps } from '../types'
import { GhostBtn, PrimaryBtn, StepTitle } from '../ui'

export function DoneStep({ data, onFinish }: StepProps) {
  const { navigate } = useTransitions()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const brand = data.role === 'brand'

  useEffect(() => {
    let live = true
    setError('')
    completeOnboarding(data)
      .then(() => {
        if (live) {
          setSaved(true)
          onFinish?.()
        }
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Could not save your profile.'))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const rows: [string, boolean][] = brand
    ? [
        ['Account created', data.accountCreated],
        ['Brand profile', data.company.trim().length > 1],
        ['Goals and budget', data.goals.length > 0],
        ['Balance funded', data.stripeConnected],
      ]
    : [
        ['Account created', data.accountCreated],
        ['Profile', data.name.trim().length > 1 && data.handle.length > 2],
        ['Social account added', Object.keys(data.linked).length > 0],
        ['Interests chosen', data.niches.length > 0],
        ['Payouts connected', data.stripeConnected],
      ]

  return (
    <div className="text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        className="mx-auto grid size-16 place-items-center rounded-full bg-paper text-ink"
      >
        <Check className="size-8" />
      </motion.span>
      <div className="mt-6">
        <StepTitle
          title={`You are in${data.name ? `, ${data.name.split(' ')[0]}` : ''}`}
          sub={brand ? 'Your workspace is ready. Launch your first campaign whenever you like.' : 'Your profile is live. Find a campaign and post your first clip.'}
        />
      </div>

      <ul className="mx-auto mt-7 max-w-sm space-y-2 text-left">
        {rows.map(([label, ok], i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.4, ease: EASE_OUT }}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] py-2 pr-4 pl-2 text-sm"
          >
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-full', ok ? 'bg-paper text-ink' : 'border border-line-strong text-mute')}>
              {ok ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
            </span>
            <span className={ok ? '' : 'text-mute'}>{label}</span>
            {!ok && <span className="ml-auto text-xs text-mute">Do later</span>}
          </motion.li>
        ))}
      </ul>

      {error && (
        <div role="alert" className="mx-auto mt-6 max-w-sm rounded-2xl border border-signal/40 bg-signal/10 p-4 text-sm text-signal">
          {error}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 block underline underline-offset-4">Try again</button>
        </div>
      )}

      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <PrimaryBtn disabled={!saved} onClick={() => navigate(brand ? '/brand/campaigns/new' : '/')}>
          {brand ? 'Create a campaign' : 'Browse campaigns'}
        </PrimaryBtn>
        <GhostBtn disabled={!saved} onClick={() => navigate(brand ? '/brand' : '/dashboard')}>
          Go to dashboard
        </GhostBtn>
      </div>
    </div>
  )
}
