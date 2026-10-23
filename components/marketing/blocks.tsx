'use client'

import { PillLink } from '@/components/motion/cta'
import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { Pillar } from './pillar'
import type { IconName } from '@/components/icons'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type Feature = { icon?: IconName; title: string; body: string }

/** A list set as rows on hairlines: the point on the left, the explanation on the right. No icons, no boxes. */
export function FeatureGrid({ features }: { features: Feature[]; cols?: 2 | 3 }) {
  return (
    <ul className="border-b border-line">
      {features.map((f, i) => (
        <Reveal as="li" key={f.title} delay={Math.min(i, 4) * 0.05} blur={false} className="grid gap-3 border-t border-line py-9 md:grid-cols-12 md:gap-10 md:py-12">
            <h3 className="font-display text-3xl leading-[1.05] tracking-[-0.03em] md:col-span-5 md:text-[2.6rem]"><T>{f.title}</T></h3>
            <p className="max-w-lg text-pretty text-lg leading-relaxed text-paper/60 md:col-span-6 md:col-start-7"><T>{f.body}</T></p>
          </Reveal>
      ))}
    </ul>
  )
}

/** The heading for a section of a page. */
export function SectionTitle({
  title,
  className,
}: {
  eyebrow?: string
  title: string
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <div className={cn('mb-14 md:mb-20', className)}>
      <Words as="h2" align="left" text={title} className="max-w-[16ch] font-display text-5xl leading-[0.95] tracking-[-0.04em] md:text-[5.5rem]" />
    </div>
  )
}

/**
 * The closing call to action: one big line and the buttons under it, in a box with a red hairline round it and a white Greek pillar down each side
 * (the Anubis page closes its last box with bands of red stipple; here they are columns).
 */
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
    <section className="py-20 md:py-36">
      <div className={cn(CONTAINER)}>
        <div className="grid grid-cols-[22px_1fr_22px] border border-[rgb(var(--c-red)/0.6)] sm:grid-cols-[40px_1fr_40px] md:grid-cols-[72px_1fr_72px]">
          <Pillar className="[--flutes:2] sm:[--flutes:4] md:[--flutes:7]" />
          <div className="px-6 py-14 md:px-16 md:py-28">
            <Words as="h2" align="left" text={title} className="max-w-[12ch] font-display text-[clamp(3rem,8vw,8rem)] leading-[0.9] tracking-[-0.045em]" />
            <Reveal delay={0.25} className="mt-12 flex flex-wrap items-center gap-3">
              <PillLink href={href}><T>{label}</T></PillLink>
              {secondaryHref && (
                <PillLink href={secondaryHref} variant="ghost">
                  <T>{secondaryLabel ?? ''}</T>
                </PillLink>
              )}
            </Reveal>
          </div>
          <Pillar className="[--flutes:2] sm:[--flutes:4] md:[--flutes:7]" />
        </div>
      </div>
    </section>
  )
}

/** A heading with copy beside it. */
export function Split({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
  flip?: boolean
}) {
  return (
    <div className="grid gap-6 border-t border-line py-16 md:grid-cols-12 md:gap-10 md:py-24">
      <Reveal className="md:col-span-5">
        <h3 className="font-display text-4xl leading-[1] tracking-[-0.035em] md:text-6xl"><T>{label}</T></h3>
      </Reveal>
      <Reveal delay={0.1} className="text-pretty text-lg leading-relaxed text-paper/60 md:col-span-6 md:col-start-7">
        {children}
      </Reveal>
    </div>
  )
}
