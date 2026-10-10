'use client'

import { NICHES, STYLES } from '@/lib/onboarding'
import { Toggle } from '@/components/app/ui'
import type { StepProps } from '../types'
import { Chip, Panel, StepTitle, toggleIn } from '../ui'

export function InterestsStep({ data, update }: StepProps) {
  return (
    <div>
      <StepTitle title="What do you like to clip?" sub="We will show the campaigns that fit first. Pick as many as you like." />

      <h2 className="mt-7 text-center font-mono text-xs tracking-widest text-mute uppercase">Topics</h2>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {NICHES.map((n) => (
          <Chip key={n} on={data.niches.includes(n)} onClick={() => update({ niches: toggleIn(data.niches, n) })}>
            {n}
          </Chip>
        ))}
      </div>

      <h2 className="mt-7 text-center font-mono text-xs tracking-widest text-mute uppercase">Your style</h2>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {STYLES.map((n) => (
          <Chip key={n} on={data.styles.includes(n)} onClick={() => update({ styles: toggleIn(data.styles, n) })}>
            {n}
          </Chip>
        ))}
      </div>

      <Panel className="mt-7">
        <ul className="divide-y divide-line text-left">
          <li className="flex items-center justify-between gap-4 pb-4">
            <span>
              <span className="block text-sm">New campaigns for me</span>
              <span className="block text-xs text-mute">Email when a match goes live.</span>
            </span>
            <Toggle label="New campaigns" checked={data.notifyCampaigns} onChange={(v) => update({ notifyCampaigns: v })} />
          </li>
          <li className="flex items-center justify-between gap-4 pt-4">
            <span>
              <span className="block text-sm">Payments and payouts</span>
              <span className="block text-xs text-mute">Verified earnings and withdrawals.</span>
            </span>
            <Toggle label="Payments and payouts" checked={data.notifyPayouts} onChange={(v) => update({ notifyPayouts: v })} />
          </li>
        </ul>
      </Panel>
    </div>
  )
}
