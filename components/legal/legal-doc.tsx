'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { CONTAINER } from '@/lib/layout'
import type { LegalDoc } from '@/lib/legal'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const [active, setActive] = useState('')

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-30% 0px -60% 0px' },
    )
    doc.sections.forEach((s) => {
      const el = document.getElementById(slug(s.h))
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [doc])

  return (
    <main>
      <motion.div style={{ scaleX }} className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-signal" />
      <header className={cn(CONTAINER, 'flex flex-col items-center pt-44 pb-16 text-center md:pt-60 md:pb-24')}>
        <Reveal y={10}>
          <p className="font-mono text-xs tracking-widest text-mute uppercase">Legal · Updated {SITE.legalUpdated}</p>
        </Reveal>
        <Words as="h1" immediate delay={0.1} text={doc.title} className="mt-8 max-w-4xl font-display text-5xl leading-[0.98] md:text-8xl" />
        <Reveal delay={0.4}>
          <p className="mx-auto mt-8 max-w-xl text-lg text-mute">{doc.summary}</p>
        </Reveal>
      </header>

      <div className={cn(CONTAINER, 'pb-40')}>
        <nav aria-label="On this page" className="mx-auto mb-24 max-w-3xl">
          <ul className="flex flex-wrap justify-center gap-2">
            {doc.sections.map((s) => (
              <li key={s.h}>
                <a
                  href={`#${slug(s.h)}`}
                  className={cn(
                    'inline-block border px-3 py-1.5 text-xs transition-colors',
                    active === slug(s.h) ? 'border-paper text-paper' : 'border-line text-mute hover:text-paper',
                  )}
                >
                  {s.h}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="mx-auto max-w-2xl text-center">
          {doc.sections.map((s, i) => (
            <Reveal key={s.h} y={20}>
              <section id={slug(s.h)} className="scroll-mt-28 border-t border-line py-16 first:border-t-0 first:pt-0">
                <p className="font-mono text-xs text-mute">{String(i + 1).padStart(2, '0')}</p>
                <h2 className="mt-3 font-display text-4xl md:text-5xl">{s.h}</h2>
                <div className="mt-8 space-y-5 leading-snug text-paper/75">
                  {s.p.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
          <p className="mt-10 border-t border-line pt-10 text-sm text-mute">
            Questions? Contact <a className="text-paper underline underline-offset-4" href={`mailto:${SITE.emails.legal}`}>{SITE.emails.legal}</a>.
          </p>
        </article>
      </div>
    </main>
  )
}
