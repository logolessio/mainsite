'use client'

import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { Tilt3D } from './tilt'
import { Words } from './words'
import { T } from '@/components/shell/copy-provider'

export type Step = { title: string; body: string; detail?: string[] }

/** Centred steps with a progress line that stays pinned under the nav while you scroll the story. */
export function StickyStory({ eyebrow, title, steps }: { eyebrow: string; title: string; steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.3', 'end 0.7'] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 })
  const width = useTransform(progress, [0, 1], ['0%', '100%'])

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{eyebrow}</T></p>
      <Words text={title} className="mt-6 max-w-[12ch] font-display text-6xl leading-[0.98] md:text-9xl" />
      <div className="sticky top-24 z-10 mt-16 h-px w-full max-w-sm bg-line">
        <motion.div style={{ width }} className="h-full bg-paper" />
      </div>
      <ol className="mt-10 flex w-full flex-col items-center">
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -20% 0px' }}
            transition={{ duration: 1, ease: EASE_OUT }}
            className="w-full max-w-2xl py-20 md:py-28"
          >
            <Tilt3D max={3} glare={false}>
              <p className="font-display text-8xl leading-none text-paper/15 md:text-[11rem]">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="-mt-6 font-display text-4xl md:-mt-12 md:text-6xl"><T>{s.title}</T></h3>
              <p className="mx-auto mt-6 max-w-lg text-pretty text-lg leading-relaxed text-mute"><T>{s.body}</T></p>
              {s.detail && (
                <ul className="mt-8 flex flex-col items-center gap-2 text-sm text-paper/80">
                  {s.detail.map((d) => (
                    <li key={d} className="flex items-center gap-3">
                      <span aria-hidden="true" className="size-1 shrink-0 bg-signal" />
                      <T>{d}</T>
                    </li>
                  ))}
                </ul>
              )}
            </Tilt3D>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}
