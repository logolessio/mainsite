import { Reveal } from '@/components/motion/reveal'
import { Layer, Tilt3D } from '@/components/motion/tilt'
import { Words } from '@/components/motion/words'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

/** A full-width, centred story beat. */
export function Chapter({
  index,
  title,
  body,
  children,
}: {
  index: string
  title: string
  body: string
  align?: 'left' | 'right' | 'center'
  children?: React.ReactNode
}) {
  return (
    <section className={cn(CONTAINER, 'relative py-32 md:py-52')}>
      <Tilt3D glare={false} max={3} className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center">
          <Reveal y={12}>
            <p className="font-mono text-xs tracking-widest text-mute uppercase">Chapter {index}</p>
          </Reveal>
          <Layer z={60}>
            <Words text={title} className="mt-8 max-w-[13ch] font-display text-5xl leading-[0.98] md:text-[6.5rem]" />
          </Layer>
          <Layer z={20}>
            <Reveal delay={0.25}>
              <p className="mx-auto mt-10 max-w-md text-pretty text-lg leading-relaxed text-mute md:text-xl">{body}</p>
            </Reveal>
          </Layer>
          {children && <Reveal delay={0.4} className="mt-14 flex w-full justify-center">{children}</Reveal>}
        </div>
      </Tilt3D>
    </section>
  )
}
