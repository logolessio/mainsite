import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { LinkedLede } from './linked-lede'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

/**
 * The top of every inner page. One very large headline, left aligned, and underneath it a quiet row:
 * what this page is on the left, one sentence and the main actions on the right.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string
  title: string
  lede?: string
  /** Kept so older pages still compile. Every hero is left aligned now. */
  align?: 'left' | 'right' | 'center'
  children?: React.ReactNode
}) {
  return (
    <header className={cn(CONTAINER, 'pt-10 pb-20 md:pt-16 md:pb-28')}>
      <Words as="h1" align="left" immediate text={title} className="max-w-[16ch] font-display text-[clamp(2.8rem,7.6vw,7rem)] leading-[0.96]" />
      <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-12">
        <Reveal delay={0.35} className="md:col-span-4">
          <p className="text-[15px] text-paper/45"><T>{eyebrow}</T></p>
        </Reveal>
        <div className="md:col-span-6 md:col-start-6">
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
