'use client'

import { PillLink } from '@/components/motion/cta'
import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import type { IconName } from '@/components/icons'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type Feature = { icon?: IconName; title: string; body: string }

/** A list set as rows on hairlines: the point on the left, the explanation on the right. No icons, no boxes. */
export function FeatureGrid({ features }: { features: Feature[]; cols?: 2 | 3 }) {
  return (
    <ul className="border-b border-line">
      {features.map((f, i) => (
        <Reveal key={f.title} delay={Math.min(i, 4) * 0.05} blur={false}>
          <li className="grid gap-3 border-t border-line py-9 md:grid-cols-12 md:gap-10 md:py-12">
            <h3 className="font-display text-3xl leading-[1.05] tracking-[-0.03em] md:col-span-5 md:text-[2.6rem]"><T>{f.title}</T></h3>
            <p className="max-w-lg text-pretty text-lg leading-relaxed text-paper/60 md:col-span-6 md:col-start-7"><T>{f.body}</T></p>
          </li>
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

/** The closing call to action: one big line and the buttons under it. */
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
      <div className={cn(CONTAINER)}>
        <Words as="h2" align="left" text={title} className="max-w-[12ch] font-display text-[clamp(3.4rem,9vw,9.5rem)] leading-[0.9] tracking-[-0.045em]" />
        <Reveal delay={0.25} className="mt-14 flex flex-wrap items-center gap-3">
          <PillLink href={href}><T>{label}</T></PillLink>
          {secondaryHref && (
            <PillLink href={secondaryHref} variant="ghost">
              <T>{secondaryLabel ?? ''}</T>
            </PillLink>
          )}
        </Reveal>
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
