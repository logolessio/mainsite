'use client'

import { motion } from 'framer-motion'
import { Icon } from '@/components/icons'
import { useFeature } from '@/components/shell/features-provider'
import { TransitionLink } from '@/components/shell/transition-link'
import type { HubGroup } from '@/lib/hubs'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

/**
 * The front page of a dashboard: every section as a big centred icon with its name, in a grid. A small number on a tile means
 * something is waiting there. Pick one and you are in; the sidebar takes over from there.
 */
export function Hub({ title, sub, groups, counts = {} }: { title: string; sub?: string; groups: HubGroup[]; counts?: Record<string, number> }) {
  const saved = useFeature('saved-campaigns')
  const recap = useFeature('recap')
  const on = (f?: string) => !f || (f === 'saved-campaigns' ? saved : f === 'recap' ? recap : true)
  let n = 0
  return (
    <div className="mx-auto max-w-4xl text-center">
      <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] tracking-[-0.035em]">{title}</h1>
      {sub && <p className="mx-auto mt-3 max-w-md text-[17px] text-paper/55">{sub}</p>}
      <div className="mt-12 grid gap-12">
        {groups.map((g, gi) => {
          const items = g.items.filter((i) => on(i.feature))
          return (
            <section key={g.title ?? gi} aria-label={g.title ?? 'Sections'}>
              {g.title && <h2 className="mb-5 text-[13px] tracking-[0.04em] text-paper/45">{g.title}</h2>}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {items.map((it) => {
                  const count = counts[it.href] ?? 0
                  const delay = Math.min(n++, 14) * 0.025
                  return (
                    <motion.li key={it.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: EASE_OUT }}>
                      <TransitionLink href={it.href} className={cn('group relative flex aspect-[1/0.92] flex-col items-center justify-center gap-4 rounded-[1.8rem] border border-line bg-white/[0.02] px-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.985]')}>
                        <span className="grid size-14 place-items-center rounded-full bg-white/[0.06] text-paper transition-colors duration-300 group-hover:bg-paper group-hover:text-ink">
                          <Icon name={it.icon} aria-hidden="true" className="size-6" />
                        </span>
                        <span className="text-[15px] leading-tight">{it.label}</span>
                        {count > 0 && (
                          <span aria-label={`${count} waiting`} className="absolute top-3 right-3 grid min-w-6 place-items-center rounded-full bg-paper px-1.5 text-[11px] leading-6 font-medium text-ink tabular-nums">
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </TransitionLink>
                    </motion.li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
