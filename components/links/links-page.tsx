'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Globe } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { IntroLogo } from '@/components/logo-intro'
import type { LinkItem } from '@/lib/socials'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

/** The page people land on from a bio: our mark, then one big tap target per place we are. The first link is the main one. */
export function LinksPage({ links, tagline }: { links: LinkItem[]; tagline: string }) {
  const [hot, setHot] = useState<string | null>(null)
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[460px] flex-col items-center px-5 pt-16 pb-12 md:pt-24">
      <motion.div initial={false} className="flex flex-col items-center text-center">
        <IntroLogo replay className="h-9 md:h-11" />
        <h1 className="mt-6 font-display text-4xl leading-none tracking-[-0.04em] md:text-5xl">logoless</h1>
        <p className="mt-3 text-[17px] text-paper/55">{tagline}</p>
      </motion.div>

      <ul className="mt-12 grid w-full grid-cols-[minmax(0,1fr)] gap-3" onPointerLeave={() => setHot(null)}>
        {links.map((l, i) => {
          const lit = hot === l.id
          const main = i === 0
          return (
            <motion.li key={l.id} className="min-w-0" initial={false}>
              <a
                href={l.url}
                {...(l.url.startsWith('https://logoless.io') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                onPointerEnter={(e) => e.pointerType !== 'touch' && setHot(l.id)}
                onFocus={() => setHot(l.id)}
                onBlur={() => setHot(null)}
                className={cn('group relative flex h-16 items-center gap-4 overflow-hidden rounded-pill px-3 pr-6 transition-[transform,color] duration-300 active:scale-[0.985]', main ? 'bg-paper text-ink' : 'border border-line-strong text-paper')}
              >
                {!main && <motion.span aria-hidden="true" initial={false} animate={{ opacity: lit ? 1 : 0 }} transition={{ duration: lit ? 0.28 : 0.45, ease: 'easeOut' }} className="pointer-events-none absolute inset-0 rounded-pill bg-white/[0.08]" />}
                <span className={cn('relative grid size-10 shrink-0 place-items-center rounded-pill', main ? 'bg-ink/[0.07]' : 'bg-white/[0.06]')}>{l.platform === 'website' ? <Globe aria-hidden="true" className="size-[18px]" /> : <BrandIcon name={l.platform} className="size-[18px]" />}</span>
                <span className="relative min-w-0 flex-1 truncate text-[17px]">{l.label}</span>
                <ArrowUpRight aria-hidden="true" className={cn('relative size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5', main ? 'text-ink/50' : 'text-paper/40')} />
              </a>
            </motion.li>
          )
        })}
      </ul>

      <motion.p initial={false} className="mt-auto pt-14 text-sm text-paper/30">
        logoless.io
      </motion.p>
    </main>
  )
}
