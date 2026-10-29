import type { Metadata } from 'next'
import { SectionHead, PosterWall } from '@/components/seventeen/home'
import { PackCard } from '@/components/seventeen/pack-card'
import { RequestBox } from '@/components/seventeen/request-box'
import { PACKS } from '@/lib/seventeen/packs'

export const metadata: Metadata = { title: 'Request a scenepack', description: 'Can’t find a pack on 17? Ask for it on the Discord, and most go up within the week.' }

type Props = { searchParams: Promise<{ q?: string }> }

const STEPS = [
  ['Look it up', 'Type the film, series or character. If it is already on 17 you will see it straight away.'],
  ['Ask on the Discord', 'Press Request: it copies the request and opens the Discord. Paste it in #requests.'],
  ['Get the pack', 'The team cuts it in the best quality there is. Most requests go up within the week.'],
]

/** 17.logoless.io/request: look for a pack first, and ask for it on the Discord when it is not up yet. Then how it works, and what went up last. */
export default async function RequestPage({ searchParams }: Props) {
  const { q } = await searchParams
  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden px-4 pb-20 pt-36 text-center sm:px-6 sm:pt-44">
        <PosterWall packs={PACKS.slice(0, 48)} columns={8} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_70%_at_50%_45%,rgb(0_0_0/0.95),rgb(0_0_0/0.75)_55%,rgb(0_0_0/0.45))]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-t from-black to-transparent" />
        <p className="s17-in s17-mono text-[11px] uppercase text-white/50">Requests</p>
        <h1 className="s17-in s17-display mx-auto mt-6 max-w-[1000px] text-[clamp(3rem,9vw,8rem)] [animation-delay:80ms]">
          <span className="s17-shimmer">Name it.</span> <span className="s17-red">We cut it.</span>
        </h1>
        <p className="s17-in mx-auto mt-7 max-w-[480px] text-[16px] leading-relaxed text-white/60 [animation-delay:160ms]">Can&apos;t find what you&apos;re after? Look it up, and if it isn&apos;t here yet, ask us for it.</p>
        <div className="s17-in [animation-delay:240ms]">
          <RequestBox packs={PACKS} initial={typeof q === 'string' ? q.slice(0, 80) : ''} />
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="relative overflow-hidden rounded-[22px] bg-white/[0.025] p-7 ring-1 ring-white/8">
              <span aria-hidden className="s17-display s17-outline absolute -right-2 -top-4 text-[120px] leading-none">{i + 1}</span>
              <p className="s17-mono text-[10.5px] uppercase text-[#ff4d6a]">Step {i + 1}</p>
              <p className="mt-4 text-[20px] font-bold tracking-[-0.02em] text-white">{title}</p>
              <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-white/55">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-24">
        <SectionHead kicker="Fresh off the timeline" title="Just added" />
        <ul className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-3 gap-y-7 px-4 sm:grid-cols-3 sm:gap-x-4 sm:px-6 md:grid-cols-4 lg:grid-cols-6 lg:px-10 xl:gap-x-5">
          {PACKS.slice(0, 12).map((p) => (
            <li key={p.slug}>
              <PackCard pack={p} />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
