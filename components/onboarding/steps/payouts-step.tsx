'use client'

import { Banknote, Check, Landmark, Loader2, Lock, Zap } from 'lucide-react'
import { useState } from 'react'
import { connectStripe } from '@/lib/onboarding'
import { SITE } from '@/lib/site'
import type { StepProps } from '../types'
import { Panel, PrimaryBtn, StepTitle } from '../ui'

export function PayoutsStep({ data, update }: StepProps) {
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    setBusy(true)
    const ok = await connectStripe('clipper')
    setBusy(false)
    if (ok) update({ stripeConnected: true })
  }

  return (
    <div>
      <StepTitle title="Get paid" sub="Connect a bank account through Stripe so your earnings have somewhere to go." />

      <ul className="mt-7 grid gap-2 text-left">
        {[
          [Landmark, 'Straight to your bank', 'In your local currency, whenever your balance passes the minimum.'],
          [Lock, 'Handled by Stripe', 'Stripe verifies your identity. We never see your bank details.'],
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

      <Panel className="mt-5 text-center">
        {data.stripeConnected ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-paper text-ink">
              <Check className="size-3.5" />
            </span>
            Stripe is connected. You are ready to get paid.
          </p>
        ) : (
          <>
            <PrimaryBtn onClick={connect} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
              Connect with Stripe
            </PrimaryBtn>
            <p className="mt-3 text-xs text-mute">Takes about five minutes. You can also do this later from your dashboard.</p>
          </>
        )}
      </Panel>
    </div>
  )
}
