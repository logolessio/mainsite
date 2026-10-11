'use client'

import { Check, Landmark, Loader2, Lock, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PayoutSetup } from '@/components/app/payout-setup'
import type { ConnectStatus } from '@/lib/connect-fields'
import { getConnect } from '@/lib/stripe-client'
import { SITE } from '@/lib/site'
import type { StepProps } from '../types'
import { Panel, StepTitle } from '../ui'

export function PayoutsStep({ data, update }: StepProps) {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getConnect()
      .then((s) => {
        setStatus(s)
        if (s.status === 'ready') update({ stripeConnected: true })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load payouts.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = (s: ConnectStatus) => {
    setStatus(s)
    if (s.status === 'ready') update({ stripeConnected: true })
  }

  return (
    <div>
      <StepTitle title="Get paid" sub="Add a bank account so your earnings have somewhere to go. You can also do this later from your dashboard." />

      <ul className="mt-7 grid gap-2 text-left">
        {[
          [Landmark, 'Straight to your bank', 'In your local currency, whenever your balance passes the minimum.'],
          [Lock, 'Checked by our payment partner', 'Your ID and bank details go to Stripe. We never keep them.'],
          [Zap, `From $${SITE.minPayoutUsd}`, 'No fee to join. No fee to withdraw from us.'],
        ].map(([Icon, t, b]) => {
          const I = Icon as typeof Landmark
          return (
            <li key={t as string} className="flex gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line">
                <I className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{t as string}</span>
                <span className="block text-xs leading-snug text-mute">{b as string}</span>
              </span>
            </li>
          )
        })}
      </ul>

      <Panel className="mt-5 text-left">
        {data.stripeConnected ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-paper text-ink">
              <Check className="size-3.5" />
            </span>
            Payouts are set up. You are ready to get paid.
          </p>
        ) : error ? (
          <p role="alert" className="text-xs text-signal">
            {error}
          </p>
        ) : status ? (
          <PayoutSetup status={status} onChange={apply} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-mute">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        )}
      </Panel>
    </div>
  )
}
