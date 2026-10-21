'use client'

import { useEffect, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

type Item = { dollars: number; campaign: string; at: number }
const ago = (t: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t))
  return s < 3600 ? `${Math.max(1, Math.floor(s / 60))}m ago` : `${Math.floor(s / 3600)}h ago`
}

/** "A creator just earned $12 on Red Room": real payouts from the last day, with no names, drifting past. Still when motion is reduced. */
export function LiveTicker() {
  const on = useFeature('live-ticker')
  const { reduced } = useMotionPrefs()
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    if (!on) return
    fetch('/api/activity')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j: { items?: Item[] }) => setItems(j.items ?? []))
      .catch(() => {})
  }, [on])
  if (!on || items.length < 3) return null
  const cell = (i: Item, k: string, hidden = false) => (
    <li key={k} aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-2 text-sm text-mute">
      <span className="text-paper tabular-nums">${i.dollars.toLocaleString('en-US')}</span> earned on {i.campaign}
      <span className="text-mute/60">{ago(i.at)}</span>
    </li>
  )
  return (
    <section aria-label="Paid in the last day" className="mt-16 overflow-hidden border-y border-line py-4 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
      <ul className={reduced ? 'flex flex-wrap justify-center gap-x-8 gap-y-2 px-4' : 'll-ticker flex w-max gap-12 hover:[animation-play-state:paused]'}>
        {items.map((i, n) => cell(i, `a${n}`))}
        {!reduced && items.map((i, n) => cell(i, `b${n}`, true))}
      </ul>
    </section>
  )
}
