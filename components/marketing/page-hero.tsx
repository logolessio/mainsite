import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { LinkedLede } from './linked-lede'
import { HeroBadges, type HeroBadgeProps, HeroPath } from './anubis'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

/**
 * The top of every inner page. One very large headline, left aligned, and underneath it a quiet row:
 * what this page is on the left, one sentence and the main actions on the right.
 */
export function PageHero({
  title,
  lede,
  badges,
  path = true,
  children,
}: {
  /** Kept so pages still compile. The small label is no longer shown. */
  eyebrow?: string
  title: string
  lede?: string
  /** Two round badges at the right of the title (wide screens). */
  badges?: HeroBadgeProps
  /** The hairline under the hero that turns a corner into an arrow (wide screens). */
  path?: boolean
  /** Kept so older pages still compile. Every hero is left aligned now. */
  align?: 'left' | 'right' | 'center'
  children?: React.ReactNode
}) {
  return (
    <header className={cn(CONTAINER, 'pt-10 pb-20 md:pt-16', path ? 'md:pb-40' : 'md:pb-28')}>
      <div className="relative">
      {badges && <HeroBadges {...badges} />}
      <Words as="h1" align="left" immediate text={title} className="max-w-[16ch] font-display text-[clamp(2.8rem,7.6vw,7rem)] leading-[0.96]" />
      <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-12">
        <div data-path-from className="md:col-span-6 md:col-start-6">
          {lede && (
            <Reveal delay={0.45}>
              <p className="max-w-[30rem] text-pretty text-lg leading-[1.55] text-paper/65 md:text-[1.375rem]"><LinkedLede text={lede} /></p>
            </Reveal>
          )}
          {children && (
            <Reveal delay={0.6} className="mt-10 flex flex-wrap items-center gap-3">
              {children}
            </Reveal>
          )}
        </div>
      </div>
      {path && <HeroPath />}
      </div>
    </header>
  )
}

export function Section({
  className,
  children,
  id,
}: {
  className?: string
  children: React.ReactNode
  id?: string
}) {
  return (
    <section id={id} className={cn(CONTAINER, 'py-24 md:py-40', className)}>
      {children}
    </section>
  )
}
