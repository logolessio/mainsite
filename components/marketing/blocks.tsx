'use client'

import { motion } from 'framer-motion'
import { Icon, type IconName } from '@/components/icons'
import { PillLink } from '@/components/motion/cta'
import { Reveal } from '@/components/motion/reveal'
import { Tilt3D } from '@/components/motion/tilt'
import { Words } from '@/components/motion/words'
import { CONTAINER, EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type Feature = { icon: IconName; title: string; body: string }

export function FeatureGrid({ features, cols = 3 }: { features: Feature[]; cols?: 2 | 3 }) {
  return (
    <ul className={cn('grid gap-px bg-line', cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
      {features.map((f, i) => (
        <motion.li
          key={f.title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: EASE_OUT }}
          className="group bg-ink transition-colors hover:bg-surface"
        >
          <Tilt3D max={5} className="h-full p-10 text-center md:p-16">
          <Icon name={f.icon} aria-hidden="true" className="mx-auto size-6 text-mute transition-colors group-hover:text-paper" />
          <h3 className="mt-10 font-display text-3xl md:text-4xl">{f.title}</h3>
          <p className="mx-auto mt-4 max-w-xs text-pretty leading-relaxed text-mute">{f.body}</p>
          </Tilt3D>
        </motion.li>
      ))}
    </ul>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string
  title: string
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <div className={cn('mb-16 flex flex-col items-center text-center md:mb-24', className)}>
      <Reveal y={10}>
        <p className="font-mono text-xs tracking-widest text-mute uppercase">{eyebrow}</p>
      </Reveal>
      <Words text={title} className="mt-6 max-w-[14ch] font-display text-5xl leading-[0.98] md:text-8xl" />
    </div>
  )
}

export function CtaBand({
  title,
  href,
  label,
  secondaryHref,
  secondaryLabel,
}: {
  title: string
  href: string
  label: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  return (
    <section className="border-t border-line py-32 md:py-52">
      <div className={`${CONTAINER} flex flex-col items-center gap-14 text-center`}>
        <Words text={title} className="max-w-[12ch] font-display text-6xl leading-[0.98] md:text-9xl" />
        <Reveal delay={0.3} className="flex flex-wrap justify-center gap-3">
          <PillLink href={href}>{label}</PillLink>
          {secondaryHref && (
            <PillLink href={secondaryHref} variant="ghost">
              {secondaryLabel}
            </PillLink>
          )}
        </Reveal>
      </div>
    </section>
  )
}

/** Centred label over copy. */
export function Split({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
  flip?: boolean
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center border-t border-line py-20 text-center md:py-28">
      <Reveal y={20}>
        <h3 className="font-display text-4xl leading-[0.95] md:text-6xl">{label}</h3>
      </Reveal>
      <Reveal delay={0.15} y={20} className="mt-8 text-pretty text-lg leading-relaxed text-mute">
        {children}
      </Reveal>
    </div>
  )
}
