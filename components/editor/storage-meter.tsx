'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Part = { n: number; bytes: number }
type Storage = { quotaBytes: number; usedBytes: number; parts: { files: Part; pictures: Part; videos: Part; cursors: Part; songs: Part } }

export const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : n > 0 ? `${Math.max(1, Math.round(n / 1024))} KB` : '0 MB')

const LABEL: Record<keyof Storage['parts'], string> = { files: 'Hosted files', pictures: 'Pictures and GIFs', videos: 'Videos', cursors: 'Cursors', songs: 'Songs' }

/** How much of a person's 50 MB is used, and by what. `refresh` is a number that changes when something was added or removed. */
export function StorageMeter({ refresh = 0, detail = false, className }: { refresh?: number; detail?: boolean; className?: string }) {
  const [s, setS] = useState<Storage | null>(null)
  useEffect(() => {
    let live = true
    fetch('/api/me/storage', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Storage>) : null))
      .then((j) => live && setS(j))
      .catch(() => null)
    return () => {
      live = false
    }
  }, [refresh])
  if (!s) return null
  const pct = Math.min(100, (s.usedBytes / s.quotaBytes) * 100)
  const full = pct >= 90
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-[0.78rem]">
        <span className="text-white">
          {mb(s.usedBytes)} <span className="text-[var(--ed-mute)]">of {mb(s.quotaBytes)} used</span>
        </span>
        <span className="tabular-nums text-[var(--ed-dim)]">{mb(Math.max(0, s.quotaBytes - s.usedBytes))} left</span>
      </div>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <span className={cn('block h-full rounded-full transition-[width] duration-500', full ? 'bg-white' : 'bg-white/70')} style={{ width: `${Math.max(pct, s.usedBytes > 0 ? 2 : 0)}%` }} />
      </span>
      {detail && (
        <ul className="mt-3 grid gap-1.5 text-[0.76rem]">
          {(Object.keys(LABEL) as (keyof Storage['parts'])[])
            .filter((k) => s.parts[k].bytes > 0)
            .map((k) => (
              <li key={k} className="flex justify-between text-[var(--ed-mute)]">
                <span>
                  {LABEL[k]} <span className="text-[var(--ed-dim)]">({s.parts[k].n})</span>
                </span>
                <span className="tabular-nums">{mb(s.parts[k].bytes)}</span>
              </li>
            ))}
          {s.usedBytes === 0 && <li className="text-[var(--ed-mute)]">Nothing yet.</li>}
        </ul>
      )}
      {detail && <p className="mt-3 text-[0.74rem] leading-snug text-[var(--ed-mute)]">Pictures, videos, songs and hosted files all count. Pictures and sounds your page is not using are cleared to make room when you add something new. A link to a file kept somewhere else costs nothing.</p>}
    </div>
  )
}
