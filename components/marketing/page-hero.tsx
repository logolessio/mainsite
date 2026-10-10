import { Reveal } from '@/components/motion/reveal'
import { Layer, Tilt3D } from '@/components/motion/tilt'
import { Words } from '@/components/motion/words'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { T } from '@/components/shell/copy-provider'

/** Hero for inner pages. Everything is centred and sits in a gently reactive 3D scene. */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string
  title: string
  lede?: string
  /** Kept for backwards compatibility. The layout is always centred. */
  align?: 'left' | 'right' | 'center'
  children?: React.ReactNode
}) {
  return (
    <header className={cn(CONTAINER, 'pt-40 pb-24 md:pt-56 md:pb-36')}>
      <Tilt3D global glare={false} max={4} className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <Reveal y={10}>
            <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{eyebrow}</T></p>
          </Reveal>
          <Layer z={70}>
            <Words
              as="h1"
              sweep
              immediate
              text={title}
              delay={0.1}
              className="mt-8 max-w-[14ch] font-display text-[13vw] leading-[0.95] md:text-[7.5vw] xl:text-[112px]"
            />
          </Layer>
          {lede && (
            <Layer z={25}>
              <Reveal delay={0.5}>
                <p className="mx-auto mt-10 max-w-xl text-pretty text-lg leading-relaxed text-mute md:text-xl"><T>{lede}</T></p>
              </Reveal>
            </Layer>
          )}
          {children && (
            <Reveal delay={0.65} className="mt-12 flex flex-wrap justify-center gap-3">
              {children}
            </Reveal>
          )}
        </div>
      </Tilt3D>
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
    <section id={id} className={cn(CONTAINER, 'py-24 text-center md:py-40', className)}>
      {children}
    </section>
  )
}
