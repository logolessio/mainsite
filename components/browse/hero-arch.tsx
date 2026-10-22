'use client'

import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'

/**
 * The picture under the home title, framed the way the Anubis page frames its own: three hairline arches one inside the other, and inside the
 * smallest one the cover of a live campaign, which gives way to the next every few seconds. Under it, in the same small type as the Anubis page's
 * ":film credits:", the name of the campaign on show, which opens it. Only real campaigns are shown. Still (the first cover) for reduced motion.
 */
export function HeroArch({ items }: { items: { id: string; title: string; cover: string }[] }) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduced || items.length < 2) return
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), 4800)
    return () => window.clearInterval(t)
  }, [reduced, items.length])
  if (items.length === 0) return null
  const now = items[i % items.length]
  return (
    <figure className="relative mx-auto mt-10 hidden w-[340px] md:block">
      <div className="relative h-[290px]">
        <span aria-hidden="true" className="absolute inset-0 rounded-t-[170px] border border-paper/35" />
        <span aria-hidden="true" className="absolute inset-[6px] rounded-t-[164px] border border-paper/22" />
        <span aria-hidden="true" className="absolute inset-[12px] rounded-t-[158px] border border-paper/12" />
        <div className="absolute inset-[18px] overflow-hidden rounded-t-[152px] bg-black">
          {items.map((c, n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={c.id} src={c.cover} alt="" aria-hidden={n !== i} className={cn('absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out', n === i ? 'hero-zoom opacity-100' : 'opacity-0')} />
          ))}
          <span aria-hidden="true" className="absolute inset-0 shadow-[inset_0_0_46px_rgb(0_0_0/0.55)]" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[11px] tracking-[0.04em] text-paper/70">
        :
        <TransitionLink href={`/campaign/${now.id}`} className="underline decoration-dotted underline-offset-4 transition-colors hover:text-paper">
          {now.title}
        </TransitionLink>
        :
      </figcaption>
    </figure>
  )
}
