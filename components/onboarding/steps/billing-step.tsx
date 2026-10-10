'use client'

import { Lock } from 'lucide-react'
import { SITE } from '@/lib/site'
import { Panel, StepTitle } from '../ui'

const STEPS = [
  ['Tell us about the campaign', 'Brief, rate per 1,000 views, budget and platforms. Nothing is charged.'],
  ['We review it and say yes', 'You get a notification the moment we confirm we will launch it.'],
  ['You pay with Stripe', 'Your budget is held for clippers. Unspent budget stays yours.'],
  ['We launch it', 'Clippers can see it and start posting straight away.'],
]

export function BillingStep() {
  return (
    <div>
      <StepTitle title="How your campaign starts" sub="You never pay before we have said yes." />
      <Panel className="mt-7">
        <ol className="grid gap-4 text-left">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-xs">{i + 1}</span>
              <span>
                <span className="block text-sm">{t}</span>
                <span className="block text-xs text-mute">{b}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-mute">
          <Lock className="size-3" /> Payments are handled by Stripe. We never see your card.
        </p>
      </Panel>
      <p className="mt-5 text-center text-xs leading-relaxed text-mute">A {SITE.platformFeePct}% platform fee applies to payouts only.</p>
    </div>
  )
}
