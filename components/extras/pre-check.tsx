'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import type { Campaign } from '@/lib/campaigns'
import { cn } from '@/lib/utils'

/**
 * Before pasting a link: the few things that get clips turned down, ticked off by the creator. It never blocks anything, it only reminds, and
 * it uses the campaign's own brief so the reminders are the ones that matter for this campaign.
 */
export function PreCheck({ campaign }: { campaign: Campaign }) {
  const on = useFeature('pre-submit-checklist')
  const items = [
    'It is posted publicly, on my own account',
    ...(campaign.previewUrl ? ['It uses the official sound'] : []),
    campaign.clipThis.length ? 'It follows what the brief asks for' : 'It matches the brief',
    ...(campaign.offLimits.length ? [`Nothing off limits: ${campaign.offLimits.slice(0, 2).join('; ')}${campaign.offLimits.length > 2 ? '…' : ''}`] : []),
  ]
  const [ticked, setTicked] = useState<Record<number, boolean>>({})
  if (!on) return null
  const left = items.filter((_, i) => !ticked[i]).length
  return (
    <fieldset className="mt-6 w-full max-w-sm rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-left">
      <legend className="sr-only">Before you submit</legend>
      <p className="mb-2 text-xs text-white/55">{left === 0 ? 'All checked. Nice.' : `Quick check before you paste (${left} to go)`}</p>
      <ul className="grid gap-1.5">
        {items.map((t, i) => (
          <li key={t}>
            <button type="button" role="checkbox" aria-checked={Boolean(ticked[i])} onClick={() => setTicked((s) => ({ ...s, [i]: !s[i] }))} className="flex w-full items-start gap-2.5 rounded-lg py-1 text-left text-[13.5px] leading-snug text-white/85 transition-colors hover:text-white">
              <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors', ticked[i] ? 'border-white bg-white text-black' : 'border-white/35')}>{ticked[i] && <Check aria-hidden="true" className="size-3" />}</span>
              {t}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
