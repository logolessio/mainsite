import type { Metadata } from 'next'
import { RequestBox } from '@/components/seventeen/request-box'
import { newestPacks } from '@/lib/seventeen/packs'

export const metadata: Metadata = { title: 'Request a scenepack', description: 'Can’t find a pack? Ask the 17 team for it.' }

type Props = { searchParams: Promise<{ q?: string }> }

/** 17.logoless.io/request: look for a pack first, and ask for it on the Discord when it is not up yet. */
export default async function RequestPage({ searchParams }: Props) {
  const { q } = await searchParams
  const packs = newestPacks()
  return (
    <section className="mx-auto max-w-[1300px] px-5 pb-10 pt-16 md:px-9 md:pt-24">
      <div className="text-center">
        <h1 data-no-shadow className="font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black uppercase leading-[0.92] tracking-[-0.045em] text-white">
          Request a scenepack
        </h1>
        <p className="mx-auto mt-5 max-w-[460px] text-[13px] leading-relaxed text-white/55">Can&apos;t find what you&apos;re after? Look it up, and if it isn&apos;t here yet, ask us for it.</p>
      </div>
      <RequestBox packs={packs} initial={typeof q === 'string' ? q.slice(0, 80) : ''} />
    </section>
  )
}
