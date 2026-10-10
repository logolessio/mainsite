'use client'

import { BUDGETS, GOALS } from '@/lib/onboarding'
import type { StepProps } from '../types'
import { Chip, StepTitle, toggleIn } from '../ui'

export function GoalsStep({ data, update }: StepProps) {
  return (
    <div>
      <StepTitle title="What are you aiming for?" sub="This helps us suggest a rate and a brief. You can change everything later." />

      <h2 className="mt-7 text-center font-mono text-xs tracking-widest text-mute uppercase">Goals</h2>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {GOALS.map((g) => (
          <Chip key={g} on={data.goals.includes(g)} onClick={() => update({ goals: toggleIn(data.goals, g) })}>
            {g}
          </Chip>
        ))}
      </div>

      <h2 className="mt-7 text-center font-mono text-xs tracking-widest text-mute uppercase">Rough monthly budget</h2>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {BUDGETS.map((b) => (
          <Chip key={b} on={data.budget === b} onClick={() => update({ budget: data.budget === b ? '' : b })}>
            {b}
          </Chip>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-mute">A guess is fine. You set the real budget per campaign.</p>
    </div>
  )
}
