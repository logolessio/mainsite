'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { AddAccountDialog } from '@/components/app/add-account-dialog'
import { BrandIcon } from '@/components/brand-icon'
import type { SocialPlatform } from '@/lib/accounts'
import type { StepProps } from '../types'
import { StepTitle } from '../ui'

const ROWS: { key: SocialPlatform; label: string; body: string }[] = [
  { key: 'tiktok', label: 'TikTok', body: 'The account you post Reels from' },
  { key: 'youtube', label: 'YouTube', body: 'Your channel for Shorts and long-form' },
  { key: 'instagram', label: 'Instagram', body: 'Where your Reels live' },
]

export function SocialsStep({ data, update }: StepProps) {
  const [dialog, setDialog] = useState<SocialPlatform | null>(null)
  const count = Object.keys(data.linked).length

  return (
    <div>
      <StepTitle title="Link where you post" sub="Add the accounts you post from. They show on your profile, and we check clips against them. We never ask for passwords." />

      <ul className="mt-7 grid gap-2">
        {ROWS.map((r) => {
          const handle = data.linked[r.key]
          return (
            <li key={r.key} className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line">
                <BrandIcon name={r.key} className="size-5" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-medium">{r.label}</span>
                <span className="block truncate text-xs text-mute">{handle ? `@${handle}` : r.body}</span>
              </span>
              {handle ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-2.5 py-1 font-mono text-[11px] text-emerald-300">
                  <Check className="size-3" /> Added
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialog(r.key)}
                  className="h-10 rounded-full bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85"
                >
                  Add
                </button>
              )}
              {handle && (
                <button
                  type="button"
                  onClick={() => {
                    const { [r.key]: _drop, ...rest } = data.linked
                    update({ linked: rest })
                  }}
                  className="text-xs text-mute underline underline-offset-4 hover:text-paper"
                >
                  Unlink
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-5 text-center text-xs leading-relaxed text-mute">
        {count > 0
          ? 'Nice. You can add more any time from your dashboard.'
          : 'Add at least one so we can match your clips to you. You can skip this and do it later.'}
      </p>

      <AddAccountDialog
        platform={dialog}
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onAdded={(p, h) => {
          setDialog(null)
          update({ linked: { ...data.linked, [p]: h } })
        }}
      />
    </div>
  )
}
