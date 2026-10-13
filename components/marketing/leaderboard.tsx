'use client'

import { motion } from 'framer-motion'
import { Crown, Eye } from 'lucide-react'
import { TransitionLink } from '@/components/shell/transition-link'
import { EASE_OUT } from '@/lib/layout'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { cn } from '@/lib/utils'

export type Entry = { handle: string; name: string; avatar: string | null; accent: string; views: number; clips: number }
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))

function Face({ e, size }: { e: Entry; size: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-raised ring-2 ring-white/15" style={{ width: size, height: size }}>
      {e.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.avatar} alt="" className="size-full object-cover" />
      ) : (
        <span className="font-medium" style={{ fontSize: size * 0.4 }}>{e.name.trim()[0]?.toUpperCase() ?? '?'}</span>
      )}
    </span>
  )
}

const MEDAL = ['from-[#fff3c4] to-[#d9a531]', 'from-[#f4f5f8] to-[#9aa0b0]', 'from-[#f1c9a5] to-[#b3703a]']

/** The top clippers: a podium for the first three, then a ranked list. */
export function Leaderboard({ entries, period }: { entries: Entry[]; period: '30' | 'all' }) {
  const top = entries.slice(0, 3)
  const rest = entries.slice(3)
  const order = [1, 0, 2] // second, first, third: the first place stands in the middle
  return (
    <div className="mx-auto max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT }} className="text-center">
        <p className="text-xs text-mute">Leaderboard</p>
        <h1 className="mt-4 font-display text-5xl tracking-tight md:text-7xl">Top clippers</h1>
        <p className="mx-auto mt-4 max-w-md text-mute">The clippers with the most verified views. Only people who've chosen to show their views are listed.</p>
        <div className="mt-7">
          <GlassTabs label="Period" value={period} tabs={[{ id: '30', label: 'Last 30 days', href: '/leaderboard' }, { id: 'all', label: 'All time', href: '/leaderboard?p=all' }]} />
        </div>
      </motion.div>

      {entries.length === 0 ? (
        <div className="mt-16 rounded-[2rem] border border-dashed border-line-strong px-6 py-16 text-center">
          <Crown className="mx-auto size-8 text-mute" />
          <p className="mt-4 font-display text-2xl">Nobody's on the board yet.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-mute">Get a clip approved, then turn on “Views generated” in your profile privacy settings to show up here.</p>
          <TransitionLink href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85">Find a campaign</TransitionLink>
        </div>
      ) : (
        <>
          <ol className="mt-16 grid grid-cols-3 items-end gap-3 md:gap-5">
            {order.map((idx, col) => {
              const e = top[idx]
              if (!e) return <li key={col} />
              const first = idx === 0
              return (
                <motion.li key={e.handle} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 + col * 0.12, ease: EASE_OUT }}>
                  <TransitionLink href={`/@${e.handle}`} className="group flex flex-col items-center text-center">
                    <span className="relative">
                      {first && <Crown className="absolute -top-7 left-1/2 size-6 -translate-x-1/2 text-[#ffd45c]" />}
                      <Face e={e} size={first ? 96 : 72} />
                    </span>
                    <span className="mt-3 max-w-full truncate text-[15px] font-medium group-hover:underline">{e.name}</span>
                    <span className="text-xs text-mute">@{e.handle}</span>
                    <span className={cn('mt-4 flex w-full flex-col items-center justify-start rounded-t-3xl bg-gradient-to-b px-2 pt-4 text-ink', MEDAL[idx], first ? 'h-44' : idx === 1 ? 'h-32' : 'h-24')}>
                      <span className="font-display text-4xl leading-none">{idx + 1}</span>
                      <span className="mt-1 font-mono text-[11px] font-medium">{compact(e.views)} views</span>
                    </span>
                  </TransitionLink>
                </motion.li>
              )
            })}
          </ol>
          {rest.length > 0 && (
            <ol className="mt-3 grid gap-2" start={4}>
              {rest.map((e, i) => (
                <motion.li key={e.handle} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 + Math.min(i * 0.04, 0.5), ease: EASE_OUT }}>
                  <TransitionLink href={`/@${e.handle}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.07]">
                    <span className="w-7 text-center font-mono text-sm text-mute tabular-nums">{i + 4}</span>
                    <Face e={e} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{e.name}</span>
                      <span className="block truncate text-xs text-mute">@{e.handle} · {e.clips} clip{e.clips === 1 ? '' : 's'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums"><Eye className="size-3.5 text-mute" />{compact(e.views)}</span>
                  </TransitionLink>
                </motion.li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}
