'use client'

import { Check, CreditCard, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { FUND_PRESETS, connectStripe } from '@/lib/onboarding'
import { SITE } from '@/lib/site'
import type { StepProps } from '../types'
import { Chip, Panel, PrimaryBtn, StepTitle } from '../ui'

export function BillingStep({ data, update }: StepProps) {
  const [busy, setBusy] = useState(false)
  const amount = data.fundAmount ?? FUND_PRESETS[1]

  const pay = async () => {
    setBusy(true)
    const ok = await connectStripe('brand')
    setBusy(false)
    if (ok) update({ stripeConnected: true, fundAmount: amount })
  }

  return (
    <div>
      <StepTitle title="Fund your first campaign" sub="Add money to your balance with Stripe. Unspent budget always stays yours." />

      <Panel className="mt-7">
        {data.stripeConnected ? (
          <p role="status" className="flex items-center justify-center gap-2 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-paper text-ink">
              <Check className="size-3.5" />
            </span>
            ${amount.toLocaleString()} added to your balance.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2">
              {FUND_PRESETS.map((p) => (
                <Chip key={p} on={amount === p} onClick={() => update({ fundAmount: p })}>
                  ${p.toLocaleString()}
                </Chip>
              ))}
            </div>
            <PrimaryBtn onClick={pay} disabled={busy || amount < SITE.minTopUpUsd} className="mt-5 w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Add ${amount.toLocaleString()} with Stripe
            </PrimaryBtn>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-mute">
              <Lock className="size-3" /> Secure checkout by Stripe. Minimum ${SITE.minTopUpUsd}.
            </p>
          </>
        )}
      </Panel>
      <p className="mt-5 text-center text-xs leading-relaxed text-mute">
        A {SITE.platformFeePct}% platform fee applies to payouts only. You can skip this and add funds when you create a campaign.
      </p>
    </div>
  )
}
